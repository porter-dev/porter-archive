//go:build ee

package jobs

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"sync"
	"time"

	"github.com/porter-dev/porter/api/server/shared/config/env"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/pkg/logger"
	"github.com/porter-dev/porter/provisioner/integrations/storage/s3"

	"github.com/porter-dev/porter/ee/integrations/vault"
	"github.com/porter-dev/porter/internal/adapter"
	"github.com/porter-dev/porter/internal/helm"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/oauth"
	"github.com/porter-dev/porter/internal/repository"
	rcreds "github.com/porter-dev/porter/internal/repository/credentials"
	rgorm "github.com/porter-dev/porter/internal/repository/gorm"
	"golang.org/x/oauth2"
	"gorm.io/gorm"
	"helm.sh/helm/v3/pkg/releaseutil"
)

var stepSize int = 100

type helmRevisionsCountTracker struct {
	enqueueTime        time.Time
	db                 *gorm.DB
	repo               repository.Repository
	doConf             *oauth2.Config
	dbConf             *env.DBConf
	credBackend        rcreds.CredentialStorage
	awsAccessKeyID     string
	awsSecretAccessKey string
	awsRegion          string
	s3BucketName       string
	encryptionKey      *[32]byte
}

type HelmRevisionsCountTrackerOpts struct {
	DBConf             *env.DBConf
	DOClientID         string
	DOClientSecret     string
	DOScopes           []string
	ServerURL          string
	AWSAccessKeyID     string
	AWSSecretAccessKey string
	AWSRegion          string
	S3BucketName       string
	EncryptionKey      *[32]byte
}

func NewHelmRevisionsCountTracker(
	enqueueTime time.Time,
	opts *HelmRevisionsCountTrackerOpts,
) (*helmRevisionsCountTracker, error) {
	db, err := adapter.New(opts.DBConf)

	if err != nil {
		return nil, err
	}

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

	return &helmRevisionsCountTracker{
		enqueueTime, db, repo, doConf, opts.DBConf, credBackend,
		opts.AWSAccessKeyID, opts.AWSSecretAccessKey, opts.AWSRegion,
		opts.S3BucketName, opts.EncryptionKey,
	}, nil
}

func (t *helmRevisionsCountTracker) ID() string {
	return "helm-revisions-count-tracker"
}

func (t *helmRevisionsCountTracker) EnqueueTime() time.Time {
	return t.enqueueTime
}

func (t *helmRevisionsCountTracker) Run() error {
	var count int64

	if err := t.db.Model(&models.Cluster{}).Count(&count).Error; err != nil {
		return err
	}

	var wg sync.WaitGroup

	for i := 0; i < (int(count)/stepSize)+1; i++ {
		var clusters []*models.Cluster

		if err := t.db.Order("id asc").Offset(i*stepSize).Limit(stepSize).Find(&clusters, "monitor_helm_releases = ?", "1").
			Error; err != nil {
			return err
		}

		// go through each project
		for _, cluster := range clusters {
			wg.Add(1)

			go func(cluster *models.Cluster) {
				defer wg.Done()

				agent, err := helm.GetAgentOutOfClusterConfig(&helm.Form{
					Cluster:                   cluster,
					Repo:                      t.repo,
					DigitalOceanOAuth:         t.doConf,
					AllowInClusterConnections: false,
				}, logger.New(true, os.Stdout))

				if err != nil {
					return
				}

				// create s3 client to store revisions that need to be deleted
				s3Client, err := s3.NewS3StorageClient(&s3.S3Options{
					t.awsRegion, t.awsAccessKeyID, t.awsSecretAccessKey, t.s3BucketName, t.encryptionKey,
				})

				if err != nil {
					log.Printf("error creating S3 client for cluster with ID %d: %v. skipping cluster ...", cluster.ID, err)
					return
				}

				namespaces, err := agent.K8sAgent.ListNamespaces()

				if err != nil {
					return
				}

				for _, ns := range namespaces.Items {
					releases, err := agent.ListReleases(ns.GetName(), &types.ReleaseListFilter{ByDate: true})

					if err != nil {
						continue
					}

					for _, rel := range releases {
						revisions, err := agent.GetReleaseHistory(rel.Name)

						if err != nil {
							continue
						}

						if len(revisions) <= 100 {
							continue
						}

						// sort revisions from newest to oldest
						releaseutil.Reverse(revisions, releaseutil.SortByRevision)

						for i := 100; i < len(revisions); i += 1 {
							rev := revisions[i]

							// store the revision in the s3 bucket before deleting it
							data, err := json.Marshal(rev)

							if err != nil {
								log.Printf("error marshalling revision for release %s, number %d: %v. skipping revision ...",
									rev.Name, rev.Version, err)
								continue
							}

							// write to the bucket with key - <project_id>/<cluster_id>/<namespace>/<release_name>/<revision_number>
							err = s3Client.WriteFileWithKey(data, true, fmt.Sprintf("%d/%d/%s/%s/%d", cluster.ProjectID,
								cluster.ID, rel.Namespace, rel.Name, rev.Version))

							if err != nil {
								log.Printf("error backing up revision for release %s, number %s: %v. skipping revision ...",
									rev.Name, rev.Version, err)
								continue
							}

							err = agent.DeleteReleaseRevision(rev.Name, rev.Version)

							if err != nil {
								continue
							}
						}
					}
				}
			}(cluster)
		}

		wg.Wait()
	}

	return nil
}

func (t *helmRevisionsCountTracker) SetData([]byte) {}
