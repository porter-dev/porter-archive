package provisioner

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"regexp"
	"strings"

	"github.com/aws/aws-sdk-go/service/ecr"
	"github.com/porter-dev/porter/internal/repository"

	redis "github.com/go-redis/redis/v8"

	"github.com/porter-dev/porter/internal/models"
)

// GlobalStreamName is the name of the Redis stream for global operations
const GlobalStreamName = "global"

// GlobalStreamGroupName is the name of the Redis consumer group that this server
// is a part of
const GlobalStreamGroupName = "portersvr"

// InitGlobalStream initializes the global stream if it does not exist, and the
// global consumer group if it does not exist
func InitGlobalStream(client *redis.Client) error {
	// determine if the stream exists
	x, err := client.Exists(
		context.Background(),
		GlobalStreamName,
	).Result()

	// if it does not exist, create group and stream
	if x == 0 {
		_, err := client.XGroupCreateMkStream(
			context.Background(),
			GlobalStreamName,
			GlobalStreamGroupName,
			">",
		).Result()

		return err
	}

	// otherwise, check if the group exists
	xInfoGroups, err := client.XInfoGroups(
		context.Background(),
		GlobalStreamName,
	).Result()

	// if error is not NOGROUP error, return
	if err != nil && !strings.Contains(err.Error(), "NOGROUP") {
		return err
	}

	for _, group := range xInfoGroups {
		// if the group exists, return with no error
		if group.Name == GlobalStreamGroupName {
			return nil
		}
	}

	// if the group does not exist, create it
	_, err = client.XGroupCreate(
		context.Background(),
		GlobalStreamName,
		GlobalStreamGroupName,
		"$",
	).Result()

	return err
}

// ResourceCRUDHandler is a handler for updates to an infra resource
type ResourceCRUDHandler interface {
	OnCreate(id uint) error
}

// GlobalStreamListener performs an XREADGROUP operation on a given stream and
// updates models in the database as necessary
func GlobalStreamListener(
	client *redis.Client,
	repo repository.Repository,
	errorChan chan error,
) {
	for {
		xstreams, err := client.XReadGroup(
			context.Background(),
			&redis.XReadGroupArgs{
				Group:    GlobalStreamGroupName,
				Consumer: "portersvr-0", // just static consumer for now
				Streams:  []string{GlobalStreamName, ">"},
				Block:    0,
			},
		).Result()

		if err != nil {
			errorChan <- err
			return
		}

		// parse messages from the global stream
		for _, msg := range xstreams[0].Messages {
			// parse the id to identify the infra
			kind, projID, infraID, err := models.ParseUniqueName(fmt.Sprintf("%v", msg.Values["id"]))

			if fmt.Sprintf("%v", msg.Values["status"]) == "created" {
				infra, err := repo.Infra.ReadInfra(infraID)

				if err != nil {
					continue
				}

				infra.Status = models.StatusCreated

				infra, err = repo.Infra.UpdateInfra(infra)

				if err != nil {
					continue
				}

				// create ECR/EKS
				if kind == string(models.InfraECR) {
					reg := &models.Registry{
						ProjectID:        projID,
						AWSIntegrationID: infra.AWSIntegrationID,
						InfraID:          infra.ID,
					}

					// parse raw data into ECR type
					dataString, ok := msg.Values["data"].(string)

					if ok {
						json.Unmarshal([]byte(dataString), reg)
					}

					awsInt, err := repo.AWSIntegration.ReadAWSIntegration(reg.AWSIntegrationID)

					if err != nil {
						continue
					}

					sess, err := awsInt.GetSession()

					if err != nil {
						continue
					}

					ecrSvc := ecr.New(sess)

					output, err := ecrSvc.GetAuthorizationToken(&ecr.GetAuthorizationTokenInput{})

					if err != nil {
						continue
					}

					reg.URL = *output.AuthorizationData[0].ProxyEndpoint

					reg, err = repo.Registry.CreateRegistry(reg)

					if err != nil {
						continue
					}
				} else if kind == string(models.InfraEKS) {
					cluster := &models.Cluster{
						AuthMechanism:    models.AWS,
						ProjectID:        projID,
						AWSIntegrationID: infra.AWSIntegrationID,
						InfraID:          infra.ID,
					}

					// parse raw data into ECR type
					dataString, ok := msg.Values["data"].(string)

					if ok {
						json.Unmarshal([]byte(dataString), cluster)
					}

					re := regexp.MustCompile(`^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$`)

					// if it matches the base64 regex, decode it
					caData := string(cluster.CertificateAuthorityData)
					if re.MatchString(caData) {
						decoded, err := base64.StdEncoding.DecodeString(caData)

						if err != nil {
							continue
						}

						cluster.CertificateAuthorityData = []byte(decoded)
					}

					cluster, err := repo.Cluster.CreateCluster(cluster)

					if err != nil {
						continue
					}
				} else if kind == string(models.InfraGCR) {
					reg := &models.Registry{
						ProjectID:        projID,
						GCPIntegrationID: infra.GCPIntegrationID,
						InfraID:          infra.ID,
						Name:             "gcr-registry",
					}

					// parse raw data into ECR type
					dataString, ok := msg.Values["data"].(string)

					if ok {
						json.Unmarshal([]byte(dataString), reg)
					}

					reg, err = repo.Registry.CreateRegistry(reg)

					if err != nil {
						continue
					}
				} else if kind == string(models.InfraGKE) {
					cluster := &models.Cluster{
						AuthMechanism:    models.GCP,
						ProjectID:        projID,
						GCPIntegrationID: infra.GCPIntegrationID,
						InfraID:          infra.ID,
					}

					// parse raw data into GKE type
					dataString, ok := msg.Values["data"].(string)

					if ok {
						json.Unmarshal([]byte(dataString), cluster)
					}

					re := regexp.MustCompile(`^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$`)

					// if it matches the base64 regex, decode it
					caData := string(cluster.CertificateAuthorityData)
					if re.MatchString(caData) {
						decoded, err := base64.StdEncoding.DecodeString(caData)

						if err != nil {
							continue
						}

						cluster.CertificateAuthorityData = []byte(decoded)
					}

					cluster, err := repo.Cluster.CreateCluster(cluster)

					if err != nil {
						continue
					}
				} else if kind == string(models.InfraDOCR) {
					reg := &models.Registry{
						ProjectID:       projID,
						DOIntegrationID: infra.DOIntegrationID,
						InfraID:         infra.ID,
					}

					// parse raw data into DOCR type
					dataString, ok := msg.Values["data"].(string)

					if ok {
						json.Unmarshal([]byte(dataString), reg)
					}

					reg, err = repo.Registry.CreateRegistry(reg)

					if err != nil {
						continue
					}
				} else if kind == string(models.InfraDOKS) {
					cluster := &models.Cluster{
						AuthMechanism:   models.DO,
						ProjectID:       projID,
						DOIntegrationID: infra.DOIntegrationID,
						InfraID:         infra.ID,
					}

					// parse raw data into GKE type
					dataString, ok := msg.Values["data"].(string)

					if ok {
						json.Unmarshal([]byte(dataString), cluster)
					}

					re := regexp.MustCompile(`^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$`)

					// if it matches the base64 regex, decode it
					caData := string(cluster.CertificateAuthorityData)
					if re.MatchString(caData) {
						decoded, err := base64.StdEncoding.DecodeString(caData)

						if err != nil {
							continue
						}

						cluster.CertificateAuthorityData = []byte(decoded)
					}

					cluster, err := repo.Cluster.CreateCluster(cluster)

					if err != nil {
						continue
					}
				}
			} else if fmt.Sprintf("%v", msg.Values["status"]) == "error" {
				infra, err := repo.Infra.ReadInfra(infraID)

				if err != nil {
					continue
				}

				infra.Status = models.StatusError

				infra, err = repo.Infra.UpdateInfra(infra)

				if err != nil {
					continue
				}
			} else if fmt.Sprintf("%v", msg.Values["status"]) == "destroyed" {
				infra, err := repo.Infra.ReadInfra(infraID)

				if err != nil {
					continue
				}

				infra.Status = models.StatusDestroyed

				infra, err = repo.Infra.UpdateInfra(infra)

				if err != nil {
					continue
				}
			}

			// acknowledge the message as read
			_, err = client.XAck(
				context.Background(),
				GlobalStreamName,
				GlobalStreamGroupName,
				msg.ID,
			).Result()

			// if error, continue for now
			if err != nil {
				continue
			}
		}
	}
}
