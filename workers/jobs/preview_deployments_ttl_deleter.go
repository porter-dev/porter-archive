//go:build ee

package jobs

import (
	"log"
	"sync"
	"time"

	"github.com/porter-dev/porter/api/server/shared/config/env"
	"github.com/porter-dev/porter/ee/integrations/vault"
	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/oauth"
	"github.com/porter-dev/porter/internal/repository"
	rcreds "github.com/porter-dev/porter/internal/repository/credentials"
	rgorm "github.com/porter-dev/porter/internal/repository/gorm"
	"golang.org/x/oauth2"
	"gorm.io/gorm"
	"k8s.io/apimachinery/pkg/api/errors"
)

/*

                         === Preview Deployments TTL Deleter Job ===

   This job goes through every active preview environment in all connected clusters and deletes the
   deployments that have exceeded their TTL, corresponding to their respective preview environment.

*/

const (
	stepSize = 20
)

type previewDeploymentsTTLDeleter struct {
	enqueueTime           time.Time
	db                    *gorm.DB
	doConf                *oauth2.Config
	repo                  repository.Repository
	previewDeploymentsTTL string
}

// PreviewDeploymentsTTLDeleterOpts holds the options required to run this job
type PreviewDeploymentsTTLDeleterOpts struct {
	DBConf                *env.DBConf
	ServerURL             string
	DOClientID            string
	DOClientSecret        string
	DOScopes              []string
	PreviewDeploymentsTTL string
}

func NewPreviewDeploymentsTTLDeleter(
	db *gorm.DB,
	enqueueTime time.Time,
	opts *PreviewDeploymentsTTLDeleterOpts,
) (*previewDeploymentsTTLDeleter, error) {
	var credBackend rcreds.CredentialStorage

	if opts.DBConf.VaultAPIKey != "" && opts.DBConf.VaultServerURL != "" && opts.DBConf.VaultPrefix != "" {
		credBackend = vault.NewClient(
			opts.DBConf.VaultServerURL,
			opts.DBConf.VaultAPIKey,
			opts.DBConf.VaultPrefix,
		)
	}

	doConf := oauth.NewDigitalOceanClient(&oauth.Config{
		ClientID:     opts.DOClientID,
		ClientSecret: opts.DOClientSecret,
		Scopes:       opts.DOScopes,
		BaseURL:      opts.ServerURL,
	})

	var key [32]byte

	for i, b := range []byte(opts.DBConf.EncryptionKey) {
		key[i] = b
	}

	repo := rgorm.NewRepository(db, &key, credBackend)

	return &previewDeploymentsTTLDeleter{enqueueTime, db, doConf, repo, opts.PreviewDeploymentsTTL}, nil
}

func (n *previewDeploymentsTTLDeleter) ID() string {
	return "preview-deployments-ttl-deleter"
}

func (n *previewDeploymentsTTLDeleter) EnqueueTime() time.Time {
	return n.enqueueTime
}

func (n *previewDeploymentsTTLDeleter) Run() error {
	if n.previewDeploymentsTTL == "" {
		log.Println("no TTL set for preview deployments, skipping job altogether")
		return nil
	}

	ttlDuration, err := time.ParseDuration(n.previewDeploymentsTTL)

	if err != nil {
		log.Printf("error parsing preview deployments TTL: %v. skipping job altogether", err)
		return err
	}

	var count int64

	if err := n.db.Model(&models.Cluster{}).Count(&count).Error; err != nil {
		return err
	}

	var wg sync.WaitGroup

	log.Println("starting deletion of preview deployments based on TTL")

	for i := 0; i < (int(count)/stepSize)+1; i++ {
		var clusters []*models.Cluster

		if err := n.db.Order("id asc").Offset(i * stepSize).Limit(stepSize).Find(&clusters).
			Error; err != nil {
			return err
		}

		for _, cluster := range clusters {
			if !cluster.PreviewEnvsEnabled {
				continue
			}

			envs, err := n.repo.Environment().ListEnvironments(cluster.ProjectID, cluster.ID)

			if err != nil {
				log.Printf("error listing environments for cluster %s: %v", cluster.Name, err)
				continue
			}

			log.Printf("found %d environments for cluster %s", len(envs), cluster.Name)

			for _, env := range envs {
				wg.Add(1)

				go func(env *models.Environment, cluster *models.Cluster) {
					defer wg.Done()

					depls, err := n.repo.Environment().ListDeployments(env.ID)

					if err != nil {
						log.Printf("error listing deployments for %s/%s: %v", env.GitRepoOwner, env.GitRepoName, err)
						return
					}

					log.Printf("found %d deployments for %s/%s", len(depls), env.GitRepoOwner, env.GitRepoName)

					log.Printf("deleting preview deployments based on TTL %s for %s/%s",
						n.previewDeploymentsTTL, env.GitRepoOwner, env.GitRepoName)

					k8sAgent, err := kubernetes.GetAgentOutOfClusterConfig(&kubernetes.OutOfClusterConfig{
						Cluster:                   cluster,
						Repo:                      n.repo,
						DigitalOceanOAuth:         n.doConf,
						AllowInClusterConnections: false,
						Timeout:                   10 * time.Second,
					})

					if err != nil {
						log.Printf("error getting k8s agent for cluster %s: %v", cluster.Name, err)
						return
					}

					for _, depl := range depls {
						// delete the deployment if it has been inactive for longer than the set TTL
						if depl.UpdatedAt.Add(ttlDuration).Before(time.Now()) {
							if depl.Namespace != "" {
								log.Printf("deleting namespace for deployment '%s'", depl.PRName)

								_, err := k8sAgent.GetNamespace(depl.Namespace)

								if err != nil && !errors.IsNotFound(err) {
									log.Printf("error getting k8s namespace for deployment '%s': %v. skipping ...",
										depl.PRName, err)
									continue
								} else if err == nil {
									err := k8sAgent.DeleteNamespace(depl.Namespace)

									if err != nil {
										log.Printf("error deleting namespace for deployment '%s': %v. skipping ...",
											depl.PRName, err)
										continue
									}
								}
							}

							log.Printf("deleting deployment '%s'", depl.PRName)

							_, err := n.repo.Environment().DeleteDeployment(depl)

							if err != nil {
								log.Printf("error deleting deployment '%s': %v", depl.PRName, err)
							}
						}
					}
				}(env, cluster)
			}

			wg.Wait()
		}
	}

	log.Println("finished deletion of preview deployments based on TTL")

	return nil
}

func (n *previewDeploymentsTTLDeleter) SetData([]byte) {}
