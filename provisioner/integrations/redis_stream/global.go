package redis_stream

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"strings"

	"github.com/porter-dev/porter/internal/analytics"
	"gorm.io/gorm"

	redis "github.com/go-redis/redis/v8"

	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"github.com/porter-dev/porter/provisioner/integrations/storage"
	"github.com/porter-dev/porter/provisioner/server/config"
	"github.com/porter-dev/porter/provisioner/types"
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

func PushToGlobalStream(
	client *redis.Client,
	infra *models.Infra,
	operation *models.Operation,
	status string,
) error {
	// pushes a new operation to the global stream
	_, err := client.XAdd(context.TODO(), &redis.XAddArgs{
		Stream: GlobalStreamName,
		ID:     "*",
		Values: map[string]interface{}{
			"id":     models.GetWorkspaceID(infra, operation),
			"status": status,
		},
	}).Result()

	return err
}

func GlobalStreamListener(
	client *redis.Client,
	config *config.Config,
	repo repository.Repository,
	analyticsClient analytics.AnalyticsSegmentClient,
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
			// ensure that the msg contains the value id
			id, exists := msg.Values["id"]

			if !exists {
				continue
			}

			workspaceID := fmt.Sprintf("%v", id)

			// TODO: add this back
			// parse the id to identify the infra
			// name, err := models.ParseUniqueNameWithOperationID(workspaceID)

			// if err != nil {
			// 	continue
			// }

			// infra, err := repo.Infra().ReadInfra(name.ProjectID, name.InfraID)

			// if err != nil {
			// 	continue
			// }

			statusVal, exists := msg.Values["status"]

			if !exists {
				continue
			}

			switch fmt.Sprintf("%v", statusVal) {
			case "created":
				// TODO: remove
				handleOperationCreated(config, client, &models.Infra{
					Model: gorm.Model{
						ID: 1,
					},
					Kind:      "test",
					Suffix:    "123456",
					ProjectID: 1,
				}, workspaceID)

			case "error":
			case "destroyed":
			}
		}
	}
}

func handleOperationCreated(config *config.Config, client *redis.Client, infra *models.Infra, workspaceID string) error {
	err := pushNewStateToStorage(config, client, infra, workspaceID)

	if err != nil {
		return err
	}

	err = cleanupStateStream(config, client, workspaceID)

	if err != nil {
		return nil
	}

	err = pushLogsToStorage(config, client, infra, workspaceID)

	if err != nil {
		return err
	}

	err = cleanupLogStream(config, client, infra, workspaceID)

	if err != nil {
		return err
	}

	return nil
}

func pushNewStateToStorage(config *config.Config, client *redis.Client, infra *models.Infra, workspaceID string) error {
	// read the current state from S3
	currState := &types.TFState{}

	currStateBytes, err := config.StorageManager.ReadFile(infra, "current_state.json", true)

	if err != nil && errors.Is(err, storage.FileDoesNotExist) {
		currState.Resources = make(map[string]*types.TFResourceState)
	} else if err != nil {
		return err
	} else {
		err := json.Unmarshal(currStateBytes, currState)

		if err != nil {
			return err
		}
	}

	// read the corresponding stream and push all updates to create the new state
	lastID := "0-0"
	var processed int64 = 0
	streamName := fmt.Sprintf("%s-state", workspaceID)

	// get the length of the stream being read
	length, err := client.XLen(context.Background(), streamName).Result()

	if err != nil {
		return err
	}

	for processed != length {
		xstream, err := client.XRead(
			context.Background(),
			&redis.XReadArgs{
				Streams: []string{streamName, lastID},
				Block:   0,
				Count:   50,
			},
		).Result()

		if err != nil {
			return err
		}

		messages := xstream[0].Messages
		lastID = messages[len(messages)-1].ID

		// compute the new state
		for _, msg := range messages {
			processed++

			stateData := &types.TFResourceState{}

			dataInter, ok := msg.Values["data"]

			if !ok {
				continue
			}

			dataString, ok := dataInter.(string)

			if !ok {
				continue
			}

			err := json.Unmarshal([]byte(dataString), stateData)

			if err != nil {
				continue
			}

			currState.Resources[stateData.ID] = stateData
		}
	}

	// push the new state to S3
	newStateBytes, err := json.Marshal(currState)

	if err != nil {
		return err
	}

	return config.StorageManager.WriteFile(infra, "current_state.json", newStateBytes, true)
}

func cleanupStateStream(config *config.Config, client *redis.Client, workspaceID string) error {
	streamName := fmt.Sprintf("%s-state", workspaceID)

	count, err := client.Del(
		context.Background(),
		streamName,
	).Result()

	if err != nil {
		return err
	}

	if count != 1 {
		return fmt.Errorf("count of deleted stream keys was not 1")
	}

	return nil
}

func pushLogsToStorage(config *config.Config, client *redis.Client, infra *models.Infra, workspaceID string) error {
	// read all logs from the corresponding stream
	lastID := "0-0"
	var processed int64 = 0
	streamName := fmt.Sprintf("%s-logs", workspaceID)
	bytesBuffer := &bytes.Buffer{}

	// get the length of the stream being read
	length, err := client.XLen(context.Background(), streamName).Result()

	if err != nil {
		return err
	}

	for processed != length {
		xstream, err := client.XRead(
			context.Background(),
			&redis.XReadArgs{
				Streams: []string{streamName, lastID},
				Block:   0,
				Count:   50,
			},
		).Result()

		if err != nil {
			return err
		}

		messages := xstream[0].Messages
		lastID = messages[len(messages)-1].ID

		// compute the new state
		for _, msg := range messages {
			processed++

			logInter, ok := msg.Values["log"]

			if !ok {
				continue
			}

			logBytes, ok := logInter.(string)

			if !ok {
				continue
			}

			bytesBuffer.Write([]byte(logBytes))
		}
	}

	// push the logs for that operation to S3
	fileBytes, err := io.ReadAll(bytesBuffer)

	if err != nil {
		return err
	}

	return config.StorageManager.WriteFile(infra, fmt.Sprintf("%s-logs.txt", workspaceID), fileBytes, false)
}

func cleanupLogStream(config *config.Config, client *redis.Client, infra *models.Infra, workspaceID string) error {
	streamName := fmt.Sprintf("%s-logs", workspaceID)

	count, err := client.Del(
		context.Background(),
		streamName,
	).Result()

	if err != nil {
		return err
	}

	if count != 1 {
		return fmt.Errorf("count of deleted stream keys was not 1")
	}

	return nil
}

// // GlobalStreamListener performs an XREADGROUP operation on a given stream and
// // updates models in the database as necessary
// func GlobalStreamListener(
// 	client *redis.Client,
// 	config *config.Config,
// 	repo repository.Repository,
// 	analyticsClient analytics.AnalyticsSegmentClient,
// 	errorChan chan error,
// ) {
// 	for {
// 		xstreams, err := client.XReadGroup(
// 			context.Background(),
// 			&redis.XReadGroupArgs{
// 				Group:    GlobalStreamGroupName,
// 				Consumer: "portersvr-0", // just static consumer for now
// 				Streams:  []string{GlobalStreamName, ">"},
// 				Block:    0,
// 			},
// 		).Result()

// 		if err != nil {
// 			errorChan <- err
// 			return
// 		}

// 		// parse messages from the global stream
// 		for _, msg := range xstreams[0].Messages {
// 			// parse the id to identify the infra
// 			kind, projID, infraID, _, err := models.ParseUniqueName(fmt.Sprintf("%v", msg.Values["id"]))

// 			if fmt.Sprintf("%v", msg.Values["status"]) == "created" {
// 				infra, err := repo.Infra().ReadInfra(projID, infraID)

// 				if err != nil {
// 					continue
// 				}

// 				infra.Status = types.StatusCreated

// 				infra, err = repo.Infra().UpdateInfra(infra)

// 				if err != nil {
// 					continue
// 				}

// 				// create ECR/EKS
// 				if kind == string(types.InfraECR) {
// 					reg := &models.Registry{
// 						ProjectID:        projID,
// 						AWSIntegrationID: infra.AWSIntegrationID,
// 						InfraID:          infra.ID,
// 					}

// 					// parse raw data into ECR type
// 					dataString, ok := msg.Values["data"].(string)

// 					if ok {
// 						json.Unmarshal([]byte(dataString), reg)
// 					}

// 					awsInt, err := repo.AWSIntegration().ReadAWSIntegration(reg.ProjectID, reg.AWSIntegrationID)

// 					if err != nil {
// 						continue
// 					}

// 					sess, err := awsInt.GetSession()

// 					if err != nil {
// 						continue
// 					}

// 					ecrSvc := ecr.New(sess)

// 					output, err := ecrSvc.GetAuthorizationToken(&ecr.GetAuthorizationTokenInput{})

// 					if err != nil {
// 						continue
// 					}

// 					reg.URL = *output.AuthorizationData[0].ProxyEndpoint

// 					reg, err = repo.Registry().CreateRegistry(reg)

// 					if err != nil {
// 						continue
// 					}

// 					analyticsClient.Track(analytics.RegistryProvisioningSuccessTrack(
// 						&analytics.RegistryProvisioningSuccessTrackOpts{
// 							RegistryScopedTrackOpts: analytics.GetRegistryScopedTrackOpts(infra.CreatedByUserID, infra.ProjectID, reg.ID),
// 							RegistryType:            infra.Kind,
// 							InfraID:                 infra.ID,
// 						},
// 					))
// 				} else if kind == string(types.InfraRDS) {
// 					// parse the last applied field to get the cluster id
// 					rdsRequest := &types.RDSInfraLastApplied{}
// 					err := json.Unmarshal(infra.LastApplied, rdsRequest)

// 					if err != nil {
// 						continue
// 					}

// 					database := &models.Database{}

// 					// parse raw data into ECR type
// 					dataString, ok := msg.Values["data"].(string)

// 					if ok {
// 						err = json.Unmarshal([]byte(dataString), database)

// 						if err != nil {
// 						}
// 					}

// 					database.Model = gorm.Model{}
// 					database.ProjectID = projID
// 					database.ClusterID = rdsRequest.ClusterID
// 					database.InfraID = infra.ID

// 					database, err = repo.Database().CreateDatabase(database)

// 					if err != nil {
// 						continue
// 					}

// 					infra.DatabaseID = database.ID
// 					infra, err = repo.Infra().UpdateInfra(infra)

// 					if err != nil {
// 						continue
// 					}

// 					err = createRDSEnvGroup(repo, config, infra, database, rdsRequest)

// 					if err != nil {
// 						continue
// 					}
// 				} else if kind == string(types.InfraEKS) {
// 					cluster := &models.Cluster{
// 						AuthMechanism:    models.AWS,
// 						ProjectID:        projID,
// 						AWSIntegrationID: infra.AWSIntegrationID,
// 						InfraID:          infra.ID,
// 					}

// 					// parse raw data into ECR type
// 					dataString, ok := msg.Values["data"].(string)

// 					if ok {
// 						json.Unmarshal([]byte(dataString), cluster)
// 					}

// 					re := regexp.MustCompile(`^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$`)

// 					// if it matches the base64 regex, decode it
// 					caData := string(cluster.CertificateAuthorityData)
// 					if re.MatchString(caData) {
// 						decoded, err := base64.StdEncoding.DecodeString(caData)

// 						if err != nil {
// 							continue
// 						}

// 						cluster.CertificateAuthorityData = []byte(decoded)
// 					}

// 					cluster, err := repo.Cluster().CreateCluster(cluster)

// 					if err != nil {
// 						continue
// 					}

// 					analyticsClient.Track(analytics.ClusterProvisioningSuccessTrack(
// 						&analytics.ClusterProvisioningSuccessTrackOpts{
// 							ClusterScopedTrackOpts: analytics.GetClusterScopedTrackOpts(infra.CreatedByUserID, infra.ProjectID, cluster.ID),
// 							ClusterType:            infra.Kind,
// 							InfraID:                infra.ID,
// 						},
// 					))
// 				} else if kind == string(types.InfraGCR) {
// 					reg := &models.Registry{
// 						ProjectID:        projID,
// 						GCPIntegrationID: infra.GCPIntegrationID,
// 						InfraID:          infra.ID,
// 						Name:             "gcr-registry",
// 					}

// 					// parse raw data into ECR type
// 					dataString, ok := msg.Values["data"].(string)

// 					if ok {
// 						json.Unmarshal([]byte(dataString), reg)
// 					}

// 					reg, err = repo.Registry().CreateRegistry(reg)

// 					if err != nil {
// 						continue
// 					}

// 					analyticsClient.Track(analytics.RegistryProvisioningSuccessTrack(
// 						&analytics.RegistryProvisioningSuccessTrackOpts{
// 							RegistryScopedTrackOpts: analytics.GetRegistryScopedTrackOpts(infra.CreatedByUserID, infra.ProjectID, reg.ID),
// 							RegistryType:            infra.Kind,
// 							InfraID:                 infra.ID,
// 						},
// 					))
// 				} else if kind == string(types.InfraGKE) {
// 					cluster := &models.Cluster{
// 						AuthMechanism:    models.GCP,
// 						ProjectID:        projID,
// 						GCPIntegrationID: infra.GCPIntegrationID,
// 						InfraID:          infra.ID,
// 					}

// 					// parse raw data into GKE type
// 					dataString, ok := msg.Values["data"].(string)

// 					if ok {
// 						json.Unmarshal([]byte(dataString), cluster)
// 					}

// 					re := regexp.MustCompile(`^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$`)

// 					// if it matches the base64 regex, decode it
// 					caData := string(cluster.CertificateAuthorityData)
// 					if re.MatchString(caData) {
// 						decoded, err := base64.StdEncoding.DecodeString(caData)

// 						if err != nil {
// 							continue
// 						}

// 						cluster.CertificateAuthorityData = []byte(decoded)
// 					}

// 					cluster, err := repo.Cluster().CreateCluster(cluster)

// 					if err != nil {
// 						continue
// 					}

// 					analyticsClient.Track(analytics.ClusterProvisioningSuccessTrack(
// 						&analytics.ClusterProvisioningSuccessTrackOpts{
// 							ClusterScopedTrackOpts: analytics.GetClusterScopedTrackOpts(infra.CreatedByUserID, infra.ProjectID, cluster.ID),
// 							ClusterType:            infra.Kind,
// 							InfraID:                infra.ID,
// 						},
// 					))
// 				} else if kind == string(types.InfraDOCR) {
// 					reg := &models.Registry{
// 						ProjectID:       projID,
// 						DOIntegrationID: infra.DOIntegrationID,
// 						InfraID:         infra.ID,
// 					}

// 					// parse raw data into DOCR type
// 					dataString, ok := msg.Values["data"].(string)

// 					if ok {
// 						json.Unmarshal([]byte(dataString), reg)
// 					}

// 					reg, err = repo.Registry().CreateRegistry(reg)

// 					if err != nil {
// 						continue
// 					}

// 					analyticsClient.Track(analytics.RegistryProvisioningSuccessTrack(
// 						&analytics.RegistryProvisioningSuccessTrackOpts{
// 							RegistryScopedTrackOpts: analytics.GetRegistryScopedTrackOpts(infra.CreatedByUserID, infra.ProjectID, reg.ID),
// 							RegistryType:            infra.Kind,
// 							InfraID:                 infra.ID,
// 						},
// 					))
// 				} else if kind == string(types.InfraDOKS) {
// 					cluster := &models.Cluster{
// 						AuthMechanism:   models.DO,
// 						ProjectID:       projID,
// 						DOIntegrationID: infra.DOIntegrationID,
// 						InfraID:         infra.ID,
// 					}

// 					// parse raw data into GKE type
// 					dataString, ok := msg.Values["data"].(string)

// 					if ok {
// 						json.Unmarshal([]byte(dataString), cluster)
// 					}

// 					re := regexp.MustCompile(`^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$`)

// 					// if it matches the base64 regex, decode it
// 					caData := string(cluster.CertificateAuthorityData)
// 					if re.MatchString(caData) {
// 						decoded, err := base64.StdEncoding.DecodeString(caData)

// 						if err != nil {
// 							continue
// 						}

// 						cluster.CertificateAuthorityData = []byte(decoded)
// 					}

// 					cluster, err := repo.Cluster().CreateCluster(cluster)

// 					if err != nil {
// 						continue
// 					}

// 					analyticsClient.Track(analytics.ClusterProvisioningSuccessTrack(
// 						&analytics.ClusterProvisioningSuccessTrackOpts{
// 							ClusterScopedTrackOpts: analytics.GetClusterScopedTrackOpts(infra.CreatedByUserID, infra.ProjectID, cluster.ID),
// 							ClusterType:            infra.Kind,
// 							InfraID:                infra.ID,
// 						},
// 					))
// 				}
// 			} else if fmt.Sprintf("%v", msg.Values["status"]) == "error" {
// 				infra, err := repo.Infra().ReadInfra(projID, infraID)

// 				if err != nil {
// 					continue
// 				}

// 				infra.Status = types.StatusError

// 				infra, err = repo.Infra().UpdateInfra(infra)

// 				if err != nil {
// 					continue
// 				}

// 				if infra.Kind == types.InfraDOKS || infra.Kind == types.InfraGKE || infra.Kind == types.InfraEKS {
// 					analyticsClient.Track(analytics.ClusterProvisioningErrorTrack(
// 						&analytics.ClusterProvisioningErrorTrackOpts{
// 							ProjectScopedTrackOpts: analytics.GetProjectScopedTrackOpts(infra.CreatedByUserID, infra.ProjectID),
// 							ClusterType:            infra.Kind,
// 							InfraID:                infra.ID,
// 						},
// 					))
// 				} else if infra.Kind == types.InfraDOCR || infra.Kind == types.InfraGCR || infra.Kind == types.InfraECR {
// 					analyticsClient.Track(analytics.RegistryProvisioningErrorTrack(
// 						&analytics.RegistryProvisioningErrorTrackOpts{
// 							ProjectScopedTrackOpts: analytics.GetProjectScopedTrackOpts(infra.CreatedByUserID, infra.ProjectID),
// 							RegistryType:           infra.Kind,
// 							InfraID:                infra.ID,
// 						},
// 					))
// 				}
// 			} else if fmt.Sprintf("%v", msg.Values["status"]) == "destroyed" {
// 				infra, err := repo.Infra().ReadInfra(projID, infraID)

// 				if err != nil {
// 					continue
// 				}

// 				infra.Status = types.StatusDestroyed

// 				infra, err = repo.Infra().UpdateInfra(infra)

// 				if err != nil {
// 					continue
// 				}

// 				if infra.Kind == types.InfraDOKS || infra.Kind == types.InfraGKE || infra.Kind == types.InfraEKS {
// 					analyticsClient.Track(analytics.ClusterDestroyingSuccessTrack(
// 						&analytics.ClusterDestroyingSuccessTrackOpts{
// 							ClusterScopedTrackOpts: analytics.GetClusterScopedTrackOpts(infra.CreatedByUserID, infra.ProjectID, 0),
// 							ClusterType:            infra.Kind,
// 							InfraID:                infra.ID,
// 						},
// 					))
// 				} else if infra.Kind == types.InfraRDS && infra.DatabaseID != 0 {
// 					rdsRequest := &types.RDSInfraLastApplied{}
// 					err := json.Unmarshal(infra.LastApplied, rdsRequest)

// 					if err != nil {
// 						continue
// 					}

// 					database, err := repo.Database().ReadDatabase(infra.ProjectID, rdsRequest.ClusterID, infra.DatabaseID)

// 					if err != nil {
// 						continue
// 					}

// 					err = deleteRDSEnvGroup(repo, config, infra, database, rdsRequest)

// 					if err != nil {
// 						continue
// 					}

// 					// delete the database
// 					err = repo.Database().DeleteDatabase(infra.ProjectID, rdsRequest.ClusterID, infra.DatabaseID)

// 					if err != nil {
// 						continue
// 					}
// 				}
// 			}

// 			// acknowledge the message as read
// 			_, err = client.XAck(
// 				context.Background(),
// 				GlobalStreamName,
// 				GlobalStreamGroupName,
// 				msg.ID,
// 			).Result()

// 			// if error, continue for now
// 			if err != nil {
// 				continue
// 			}
// 		}
// 	}
// }

// func createRDSEnvGroup(repo repository.Repository, config *config.Config, infra *models.Infra, database *models.Database, rdsConfig *types.RDSInfraLastApplied) error {

// 	cluster, err := repo.Cluster().ReadCluster(infra.ProjectID, rdsConfig.ClusterID)

// 	if err != nil {
// 		return err
// 	}

// 	ooc := &kubernetes.OutOfClusterConfig{
// 		Repo:              config.Repo,
// 		DigitalOceanOAuth: config.DOConf,
// 		Cluster:           cluster,
// 	}

// 	agent, err := kubernetes.GetAgentOutOfClusterConfig(ooc)

// 	if err != nil {
// 		return fmt.Errorf("failed to get agent: %s", err.Error())
// 	}

// 	_, err = envgroup.CreateEnvGroup(agent, types.ConfigMapInput{
// 		Name:      fmt.Sprintf("rds-credentials-%s", rdsConfig.DBName),
// 		Namespace: rdsConfig.Namespace,
// 		Variables: map[string]string{},
// 		SecretVariables: map[string]string{
// 			"HOST":     database.InstanceEndpoint,
// 			"PASSWORD": rdsConfig.Password,
// 			"USERNAME": rdsConfig.Username,
// 		},
// 	})

// 	if err != nil {
// 		return fmt.Errorf("failed to create RDS env group: %s", err.Error())
// 	}

// 	return nil
// }

// func deleteRDSEnvGroup(repo repository.Repository, config *config.Config, infra *models.Infra, database *models.Database, rdsConfig *types.RDSInfraLastApplied) error {
// 	cluster, err := repo.Cluster().ReadCluster(infra.ProjectID, rdsConfig.ClusterID)

// 	if err != nil {
// 		return err
// 	}

// 	ooc := &kubernetes.OutOfClusterConfig{
// 		Repo:              config.Repo,
// 		DigitalOceanOAuth: config.DOConf,
// 		Cluster:           cluster,
// 	}

// 	agent, err := kubernetes.GetAgentOutOfClusterConfig(ooc)

// 	if err != nil {
// 		return fmt.Errorf("failed to get agent: %s", err.Error())
// 	}

// 	err = envgroup.DeleteEnvGroup(agent, fmt.Sprintf("rds-credentials-%s", rdsConfig.DBName), rdsConfig.Namespace)

// 	if err != nil {
// 		return fmt.Errorf("failed to create RDS env group: %s", err.Error())
// 	}

// 	return nil
// }
