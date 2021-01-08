package provisioner

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"regexp"

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

	fmt.Println(xInfoGroups, err)

	if err != nil {
		return err
	}

	for _, group := range xInfoGroups {
		// if the group exists, return with no error
		if group.Name == GlobalStreamGroupName {
			fmt.Println("group already exists")
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

	fmt.Println("xgroup created", err)

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
	fmt.Println("starting global stream listener")

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

		fmt.Println(xstreams, err)

		if err != nil {
			errorChan <- err
			return
		}

		// parse messages from the global stream
		for _, msg := range xstreams[0].Messages {
			// parse the id to identify the infra
			kind, projID, infraID, err := models.ParseWorkspaceID(fmt.Sprintf("%v", msg.Values["id"]))

			if fmt.Sprintf("%v", msg.Values["status"]) == "created" {
				infra, err := repo.AWSInfra.ReadAWSInfra(infraID)

				if err != nil {
					continue
				}

				infra.Status = models.StatusCreated

				infra, err = repo.AWSInfra.UpdateAWSInfra(infra)

				if err != nil {
					continue
				}

				// create ECR/EKS
				if kind == string(models.AWSInfraECR) {
					reg := &models.Registry{
						ProjectID:        projID,
						AWSIntegrationID: infra.AWSIntegrationID,
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
				} else if kind == string(models.AWSInfraEKS) {
					cluster := &models.Cluster{
						AuthMechanism:    models.AWS,
						ProjectID:        projID,
						AWSIntegrationID: infra.AWSIntegrationID,
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
				}
			} else if fmt.Sprintf("%v", msg.Values["status"]) == "error" {
				infra, err := repo.AWSInfra.ReadAWSInfra(infraID)

				if err != nil {
					continue
				}

				infra.Status = models.StatusError

				infra, err = repo.AWSInfra.UpdateAWSInfra(infra)

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
