//go:build ee

/*

                            === NGINX Recommender Job ===

This job checks an NGINX instance installed on a cluster and makes a recommendation.

TODO: recommender alg details

*/

package jobs

import (
	"context"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/mitchellh/mapstructure"
	"github.com/porter-dev/porter/api/server/shared/config/env"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/pkg/logger"
	"k8s.io/apimachinery/pkg/api/resource"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/porter-dev/porter/ee/integrations/vault"
	"github.com/porter-dev/porter/internal/helm"
	"github.com/porter-dev/porter/internal/helm/grapher"
	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/oauth"
	"github.com/porter-dev/porter/internal/repository"
	rcreds "github.com/porter-dev/porter/internal/repository/credentials"
	rgorm "github.com/porter-dev/porter/internal/repository/gorm"
	"golang.org/x/oauth2"
	"gorm.io/gorm"
)

type nginxRecommender struct {
	enqueueTime          time.Time
	db                   *gorm.DB
	repo                 repository.Repository
	doConf               *oauth2.Config
	projectID, clusterID uint
}

// HelmRevisionsCountTrackerOpts holds the options required to run this job
type NGINXRecommenderOpts struct {
	DBConf         *env.DBConf
	DOClientID     string
	DOClientSecret string
	DOScopes       []string
	ServerURL      string

	Input map[string]interface{}
}

type nginxRecommenderInput struct {
	ProjectID uint `form:"required" mapstructure:"project_id"`
	ClusterID uint `form:"required" mapstructure:"cluster_id"`
}

type RecommendationSeverity string

const (
	RecommendationSeverityUrgent RecommendationSeverity = "urgent"
	RecommendationSeverityHigh   RecommendationSeverity = "high"
	RecommendationSeverityLow    RecommendationSeverity = "low"
)

type RecommendationID string

const (
	RecommendationIDNginxIngressHPA                      RecommendationID = "nginx-ingress-hpa"
	RecommendationIDNginxIngressTopologySpreadConstraint RecommendationID = "nginx-ingress-topology-spread-constraint"
	RecommendationIDNginxIngressMemory                   RecommendationID = "nginx-ingress-memory-limit"
	RecommendationIDNginxLifecycleHook                   RecommendationID = "nginx-ingress-lifecycle-hook"
)

type Recommendation struct {
	ID         RecommendationID
	Message    string
	Automatic  bool
	Severity   RecommendationSeverity
	Warning    string
	LastTested time.Time
}

func NewNGINXRecommender(
	db *gorm.DB,
	enqueueTime time.Time,
	opts *NGINXRecommenderOpts,
) (*nginxRecommender, error) {
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
	parsedInput := &nginxRecommenderInput{}
	err := mapstructure.Decode(opts.Input, parsedInput)

	if err != nil {
		return nil, err
	}

	// validate
	validator := requestutils.NewDefaultValidator()

	if requestErr := validator.Validate(parsedInput); requestErr != nil {
		return nil, fmt.Errorf(requestErr.Error())
	}

	return &nginxRecommender{
		enqueueTime, db, repo, doConf, parsedInput.ProjectID, parsedInput.ClusterID,
	}, nil
}

func (n *nginxRecommender) ID() string {
	return "nginx-recommender"
}

func (n *nginxRecommender) EnqueueTime() time.Time {
	return n.enqueueTime
}

func (n *nginxRecommender) Run() error {
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

	helmAgent, err := helm.GetAgentOutOfClusterConfig(&helm.Form{
		Cluster:                   cluster,
		Namespace:                 "ingress-nginx",
		Repo:                      n.repo,
		DigitalOceanOAuth:         n.doConf,
		AllowInClusterConnections: false,
	}, logger.New(true, os.Stdout))

	if err != nil {
		log.Printf("error getting helm agent for cluster ID %d: %v. skipping cluster ...", n.clusterID, err)
		return err
	}

	// read the nginx ingress helm release
	nginxIngressRelease, err := helmAgent.GetRelease("nginx-ingress", 0, false)

	if err != nil {
		log.Printf("could not get nginx-ingress for cluster ID %d: %v. skipping cluster ...", n.clusterID, err)
		return err
	}

	// parse the manifests for the deployment name
	multiArr := grapher.ImportMultiDocYAML([]byte(nginxIngressRelease.Manifest))

	grapherObj := grapher.ParseObjs(multiArr, "ingress-nginx")

	recs := generateRecommendations(k8sAgent, cluster, grapherObj)

	for _, rec := range recs {
		fmt.Println(rec.ID, rec.Message)
	}

	return nil
}

func generateRecommendations(k8sAgent *kubernetes.Agent, cluster *models.Cluster, grapherObj []grapher.Object) []*Recommendation {
	res := make([]*Recommendation, 0)

	if hpaRec := generateHPARecommendation(grapherObj); hpaRec != nil {
		res = append(res, hpaRec)
	}

	if tscRec := generateTopologySpreadConstraintRecommendation(k8sAgent, grapherObj); tscRec != nil {
		res = append(res, tscRec)
	}

	if memRec := generateMemoryLimitRecommendation(k8sAgent, grapherObj); memRec != nil {
		res = append(res, memRec)
	}

	if lhRec := generateLifecycleHookRecommendation(k8sAgent, cluster, grapherObj); lhRec != nil {
		res = append(res, lhRec)
	}

	return res
}

func generateHPARecommendation(grapherObj []grapher.Object) *Recommendation {
	// check if a horizontal pod autoscaler has been enabled
	isEnabled := false

	for _, obj := range grapherObj {
		if strings.ToLower(obj.Kind) == "horizontalpodautoscaler" {
			isEnabled = true
		}
	}

	// if not enabled, return recommendation
	if !isEnabled {
		return &Recommendation{
			Severity:  RecommendationSeverityLow,
			ID:        "nginx-ingress-hpa",
			Message:   "Horizontal pod autoscaling should be enabled on the NGINX ingress controller, which allows for the proxy to scale during load.",
			Automatic: true,
		}
	}

	return nil
}

func generateTopologySpreadConstraintRecommendation(k8sAgent *kubernetes.Agent, grapherObj []grapher.Object) *Recommendation {
	for _, obj := range grapherObj {
		if strings.ToLower(obj.Kind) == "deployment" {
			// query the live deployment
			depl, err := k8sAgent.Clientset.AppsV1().Deployments(obj.Namespace).Get(context.Background(), obj.Name, v1.GetOptions{})

			if err != nil {
				continue
			}

			// make sure deployment is a controller type
			if compLabel, exists := depl.Labels["app.kubernetes.io/component"]; exists && compLabel == "controller" {
				// check if the pod has a topology spread constraint set
				if len(depl.Spec.Template.Spec.TopologySpreadConstraints) == 0 {
					return &Recommendation{
						Severity:  RecommendationSeverityLow,
						ID:        RecommendationIDNginxIngressTopologySpreadConstraint,
						Message:   "Topology spread constraints should be enabled on the NGINX deployment, which ensures that the NGINX instances are balanced across different zones and machines.",
						Automatic: true,
					}
				}
			}
		}
	}

	return nil
}

func generateMemoryLimitRecommendation(k8sAgent *kubernetes.Agent, grapherObj []grapher.Object) *Recommendation {
	for _, obj := range grapherObj {
		if strings.ToLower(obj.Kind) == "deployment" {
			// query the live deployment
			depl, err := k8sAgent.Clientset.AppsV1().Deployments(obj.Namespace).Get(context.Background(), obj.Name, v1.GetOptions{})

			if err != nil {
				continue
			}

			// make sure deployment is a controller type
			if compLabel, exists := depl.Labels["app.kubernetes.io/component"]; exists && compLabel == "controller" {
				// make sure the controller container has memory limits set
				for _, container := range depl.Spec.Template.Spec.Containers {
					if container.Name == "controller" {
						if mem := container.Resources.Limits.Memory(); mem == nil || resource.NewQuantity(0, resource.BinarySI).Equal(*mem) {
							return &Recommendation{
								Severity:  RecommendationSeverityHigh,
								ID:        RecommendationIDNginxIngressMemory,
								Message:   "Memory limits should be enabled for the NGINX instance.",
								Automatic: true,
							}
						}
					}
				}
			}
		}
	}

	return nil
}

func generateLifecycleHookRecommendation(k8sAgent *kubernetes.Agent, cluster *models.Cluster, grapherObj []grapher.Object) *Recommendation {
	// only generate this recommendation for EKS clusters
	if cluster.AWSIntegrationID == 0 {
		return nil
	}

	rec := &Recommendation{
		Severity:  RecommendationSeverityLow,
		ID:        RecommendationIDNginxLifecycleHook,
		Message:   "Lifecycle hook should be modified to sleep for 2 minutes before NGINX ingress termination, to allow for AWS load balancers to update targets.",
		Automatic: true,
	}

	for _, obj := range grapherObj {
		if strings.ToLower(obj.Kind) == "deployment" {
			// query the live deployment
			depl, err := k8sAgent.Clientset.AppsV1().Deployments(obj.Namespace).Get(context.Background(), obj.Name, v1.GetOptions{})

			if err != nil {
				continue
			}

			// make sure deployment is a controller type
			if compLabel, exists := depl.Labels["app.kubernetes.io/component"]; exists && compLabel == "controller" {
				// make sure the controller container has memory limits set
				for _, container := range depl.Spec.Template.Spec.Containers {
					if container.Name != "controller" {
						continue
					}

					if container.Lifecycle == nil || container.Lifecycle.PreStop == nil || container.Lifecycle.PreStop.Exec == nil {
						return rec
					}

					if len(container.Lifecycle.PreStop.Exec.Command) == 0 || container.Lifecycle.PreStop.Exec.Command[0] == "/wait-shutdown" {
						return rec
					}
				}
			}
		}
	}

	return nil
}

func (n *nginxRecommender) SetData([]byte) {}
