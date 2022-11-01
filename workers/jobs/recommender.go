//go:build ee

/*

                            === Recommender Job ===

This job checks to see if a cluster matches policies set by the OPA config file.

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
	"github.com/porter-dev/porter/internal/encryption"
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
	clusterAndProjectIDs []clusterAndProjectID
	categories           []string
	policies             *opa.KubernetesPolicies
	runRecommenderID     string
}

// RecommenderOpts holds the options required to run this job
type RecommenderOpts struct {
	DBConf         *env.DBConf
	DOClientID     string
	DOClientSecret string
	DOScopes       []string
	ServerURL      string

	LegacyProjectIDs []uint

	Input map[string]interface{}
}

type recommenderInput struct {
	Projects  []uint `mapstructure:"projects"`
	ClusterID uint   `mapstructure:"cluster_id"`

	Priority string `mapstructure:"priority"`

	Categories []string `mapstructure:"categories"`
}

type clusterAndProjectID struct {
	clusterID uint
	projectID uint
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

	clusterIDs, err := getClustersToParse(db, repo.Cluster(), parsedInput, opts.LegacyProjectIDs)

	if err != nil {
		return nil, err
	}

	recommenderID, err := encryption.GenerateRandomBytes(32)

	if err != nil {
		return nil, err
	}

	return &recommender{
		enqueueTime, db, repo, doConf, clusterIDs, parsedInput.Categories, opaPolicies, string(recommenderID),
	}, nil
}

func getClustersToParse(db *gorm.DB, clusterRepo repository.ClusterRepository, input *recommenderInput, legacyProjects []uint) ([]clusterAndProjectID, error) {
	// if the project and cluster ID is set, make sure that the project id matches the cluster's
	// project id
	if input.ClusterID != 0 {
		if len(input.Projects) != 1 {
			return nil, fmt.Errorf("if cluster ID is passed, you must pass the matching project ID")
		}

		_, err := clusterRepo.ReadCluster(input.Projects[0], input.ClusterID)

		if err != nil {
			return nil, err
		}

		return []clusterAndProjectID{{
			clusterID: input.ClusterID,
			projectID: input.Projects[0],
		}}, nil
	}

	// if there are no projects set, query for all clusters within the relevant projects
	clusters := make([]*models.Cluster, 0)

	query := db.Where(`clusters.project_id IN (?) OR clusters.project_id IN (
		SELECT p2.id FROM projects AS p2
		INNER JOIN project_usages ON p2.id=project_usages.project_id
		WHERE project_usages.resource_cpu != 10 AND project_usages.resource_memory != 20000 AND project_usages.clusters != 1 AND project_usages.users != 1
	)`, legacyProjects)

	if err := query.Find(&clusters).Error; err != nil {
		return nil, err
	}

	res := make([]clusterAndProjectID, 0)

	for _, cluster := range clusters {
		res = append(res, clusterAndProjectID{
			clusterID: cluster.ID,
			projectID: cluster.ProjectID,
		})
	}

	return res, nil
}

func (n *recommender) ID() string {
	return "recommender"
}

func (n *recommender) EnqueueTime() time.Time {
	return n.enqueueTime
}

func (n *recommender) Run() error {
	for _, ids := range n.clusterAndProjectIDs {
		fmt.Println(ids.projectID, ids.clusterID)

		cluster, err := n.repo.Cluster().ReadCluster(ids.projectID, ids.clusterID)

		if err != nil {
			log.Printf("error reading cluster ID %d: %v. skipping cluster ...", ids.clusterID, err)
			continue
		}

		k8sAgent, err := kubernetes.GetAgentOutOfClusterConfig(&kubernetes.OutOfClusterConfig{
			Cluster:                   cluster,
			Repo:                      n.repo,
			DigitalOceanOAuth:         n.doConf,
			AllowInClusterConnections: false,
			Timeout:                   5 * time.Second,
		})

		if err != nil {
			log.Printf("error getting k8s agent for cluster ID %d: %v. skipping cluster ...", ids.clusterID, err)
			continue
		}

		dynamicClient, err := kubernetes.GetDynamicClientOutOfClusterConfig(&kubernetes.OutOfClusterConfig{
			Cluster:                   cluster,
			Repo:                      n.repo,
			DigitalOceanOAuth:         n.doConf,
			AllowInClusterConnections: false,
		})

		if err != nil {
			log.Printf("error getting dynamic client for cluster ID %d: %v. skipping cluster ...", ids.clusterID, err)
			continue
		}

		runner := opa.NewRunner(n.policies, cluster, k8sAgent, dynamicClient)

		queryResults, err := runner.GetRecommendations(n.categories)

		if err != nil {
			log.Printf("error querying opa policies for cluster ID %d: %v. skipping cluster ...", ids.clusterID, err)
			continue
		}

		for _, queryRes := range queryResults {
			fmt.Println(queryRes.ObjectID, queryRes.Allow, queryRes.PolicyTitle, queryRes.PolicyMessage)

			monitor, err := n.repo.MonitorTestResult().ReadMonitorTestResult(ids.projectID, ids.clusterID, queryRes.ObjectID)

			if err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					monitor, err = n.repo.MonitorTestResult().CreateMonitorTestResult(n.getMonitorTestResultFromQueryResult(cluster, queryRes, n.runRecommenderID))
				} else {
					continue
				}
			} else {
				monitor, err = n.repo.MonitorTestResult().UpdateMonitorTestResult(mergeMonitorTestResultFromQueryResult(monitor, queryRes, n.runRecommenderID))
			}

			if err != nil {
				continue
			}
		}

		err = n.repo.MonitorTestResult().ArchiveMonitorTestResults(ids.projectID, ids.clusterID, n.runRecommenderID)

		if err != nil {
			log.Printf("error archiving test results for cluster ID %d: %v", ids.clusterID, err)
			continue
		}

		err = n.repo.MonitorTestResult().DeleteOldMonitorTestResults(ids.projectID, ids.clusterID, n.runRecommenderID)

		if err != nil {
			log.Printf("error deleting old test results for cluster ID %d: %v", ids.clusterID, err)
			continue
		}
	}

	return nil
}

func (n *recommender) getMonitorTestResultFromQueryResult(cluster *models.Cluster, queryRes *opa.OPARecommenderQueryResult, recommenderID string) *models.MonitorTestResult {
	runResult := types.MonitorTestStatusSuccess

	if !queryRes.Allow {
		runResult = types.MonitorTestStatusFailed
	}

	currTime := time.Now()

	return &models.MonitorTestResult{
		ProjectID:            cluster.ProjectID,
		ClusterID:            cluster.ID,
		Category:             queryRes.CategoryName,
		ObjectID:             queryRes.ObjectID,
		LastStatusChange:     &currTime,
		LastTested:           &currTime,
		LastRunResult:        string(runResult),
		LastRunResultEnum:    models.GetLastRunResultEnum(string(runResult)),
		LastRecommenderRunID: recommenderID,
		Title:                queryRes.PolicyTitle,
		Message:              queryRes.PolicyMessage,
		Severity:             queryRes.PolicySeverity,
		SeverityEnum:         models.GetSeverityEnum(queryRes.PolicySeverity),
		Archived:             false,
	}
}

func mergeMonitorTestResultFromQueryResult(monitor *models.MonitorTestResult, queryRes *opa.OPARecommenderQueryResult, recommenderID string) *models.MonitorTestResult {
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
	monitor.SeverityEnum = models.GetSeverityEnum(queryRes.PolicySeverity)
	monitor.LastRunResultEnum = models.GetLastRunResultEnum(string(runResult))
	monitor.LastRecommenderRunID = recommenderID
	monitor.Archived = false

	return monitor
}

func (n *recommender) SetData([]byte) {}
