//go:build ee

/*

                            === NGINX Recommender Job ===

This job checks an NGINX instance installed on a cluster and makes a recommendation.

TODO: recommender alg details

*/

package jobs

import (
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/mitchellh/mapstructure"
	"github.com/porter-dev/porter/api/server/shared/config/env"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"

	"github.com/porter-dev/porter/ee/integrations/vault"
	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/oauth"
	"github.com/porter-dev/porter/internal/opa"
	"github.com/porter-dev/porter/internal/repository"
	rcreds "github.com/porter-dev/porter/internal/repository/credentials"
	rgorm "github.com/porter-dev/porter/internal/repository/gorm"
	"golang.org/x/oauth2"
	"gorm.io/gorm"
)

type recommender struct {
	enqueueTime          time.Time
	db                   *gorm.DB
	repo                 repository.Repository
	doConf               *oauth2.Config
	projectID, clusterID uint
	collectionName       string
	policies             *opa.KubernetesPolicies
}

// HelmRevisionsCountTrackerOpts holds the options required to run this job
type RecommenderOpts struct {
	DBConf         *env.DBConf
	DOClientID     string
	DOClientSecret string
	DOScopes       []string
	ServerURL      string

	Input map[string]interface{}
}

type recommenderInput struct {
	ProjectID uint `form:"required" mapstructure:"project_id"`
	ClusterID uint `form:"required" mapstructure:"cluster_id"`

	CollectionName string `form:"required" mapstructure:"name"`
}

type Recommendation struct {
	// ID         RecommendationID
	Message   string
	Automatic bool
	// Severity   RecommendationSeverity
	Warning    string
	LastTested time.Time
}

func NewRecommender(
	db *gorm.DB,
	enqueueTime time.Time,
	opts *RecommenderOpts,
	opaPolicies *opa.KubernetesPolicies,
) (*recommender, error) {
	var credBackend rcreds.CredentialStorage

	if opts.DBConf.VaultAPIKey != "" && opts.DBConf.VaultServerURL != "" && opts.DBConf.VaultPrefix != "" {
		credBackend = vault.NewClient(
			opts.DBConf.VaultServerURL,
			opts.DBConf.VaultAPIKey,
			opts.DBConf.VaultPrefix,
		)
	}

	var key [32]byte

	for i, b := range []byte(opts.DBConf.EncryptionKey) {
		key[i] = b
	}

	repo := rgorm.NewRepository(db, &key, credBackend)

	doConf := oauth.NewDigitalOceanClient(&oauth.Config{
		ClientID:     opts.DOClientID,
		ClientSecret: opts.DOClientSecret,
		Scopes:       opts.DOScopes,
		BaseURL:      opts.ServerURL,
	})

	// parse input
	parsedInput := &recommenderInput{}
	err := mapstructure.Decode(opts.Input, parsedInput)

	if err != nil {
		return nil, err
	}

	// validate
	validator := requestutils.NewDefaultValidator()

	if requestErr := validator.Validate(parsedInput); requestErr != nil {
		return nil, fmt.Errorf(requestErr.Error())
	}

	return &recommender{
		enqueueTime, db, repo, doConf, parsedInput.ProjectID, parsedInput.ClusterID, parsedInput.CollectionName, opaPolicies,
	}, nil
}

func (n *recommender) ID() string {
	return "recommender"
}

func (n *recommender) EnqueueTime() time.Time {
	return n.enqueueTime
}

func (n *recommender) Run() error {
	fmt.Println(n.projectID, n.clusterID)

	cluster, err := n.repo.Cluster().ReadCluster(n.projectID, n.clusterID)

	if err != nil {
		log.Printf("error reading cluster ID %d: %v. skipping cluster ...", n.clusterID, err)
		return err
	}

	k8sAgent, err := kubernetes.GetAgentOutOfClusterConfig(&kubernetes.OutOfClusterConfig{
		Cluster:                   cluster,
		Repo:                      n.repo,
		DigitalOceanOAuth:         n.doConf,
		AllowInClusterConnections: false,
	})

	if err != nil {
		log.Printf("error getting k8s agent for cluster ID %d: %v. skipping cluster ...", n.clusterID, err)
		return err
	}

	runner := opa.NewRunner(n.policies, k8sAgent)

	queryResults, err := runner.GetRecommendationsByName(n.collectionName)

	if err != nil {
		log.Printf("error querying opa policies for cluster ID %d: %v. skipping cluster ...", n.clusterID, err)
		return err
	}

	for _, queryRes := range queryResults {
		fmt.Println(queryRes.ObjectID, queryRes.Allow, queryRes.PolicyTitle, queryRes.PolicyMessage)

		monitor, err := n.repo.MonitorTestResult().ReadMonitorTestResult(n.projectID, n.clusterID, queryRes.ObjectID)

		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				monitor, err = n.repo.MonitorTestResult().CreateMonitorTestResult(n.getMonitorTestResultFromQueryResult(queryRes))
			} else {
				return err
			}
		} else {
			monitor, err = n.repo.MonitorTestResult().UpdateMonitorTestResult(mergeMonitorTestResultFromQueryResult(monitor, queryRes))
		}

		if err != nil {
			return err
		}
	}

	return nil
}

func (n *recommender) getMonitorTestResultFromQueryResult(queryRes *opa.OPARecommenderQueryResult) *models.MonitorTestResult {
	runResult := types.MonitorTestStatusSuccess

	if !queryRes.Allow {
		runResult = types.MonitorTestStatusFailed
	}

	currTime := time.Now()

	return &models.MonitorTestResult{
		ProjectID:        n.projectID,
		ClusterID:        n.clusterID,
		Category:         queryRes.CategoryName,
		ObjectID:         queryRes.ObjectID,
		LastStatusChange: &currTime,
		LastTested:       &currTime,
		LastRunResult:    string(runResult),
		Title:            queryRes.PolicyTitle,
		Message:          queryRes.PolicyMessage,
		Severity:         queryRes.PolicySeverity,
	}
}

func mergeMonitorTestResultFromQueryResult(monitor *models.MonitorTestResult, queryRes *opa.OPARecommenderQueryResult) *models.MonitorTestResult {
	runResult := types.MonitorTestStatusSuccess

	if !queryRes.Allow {
		runResult = types.MonitorTestStatusFailed
	}

	currTime := time.Now()

	if isStatusChange := monitor.LastRunResult == string(runResult); isStatusChange {
		monitor.LastStatusChange = &currTime
	}

	monitor.LastTested = &currTime
	monitor.LastRunResult = string(runResult)
	monitor.Title = queryRes.PolicyTitle
	monitor.Message = queryRes.PolicyMessage
	monitor.Severity = queryRes.PolicySeverity

	return monitor
}

func (n *recommender) SetData([]byte) {}
