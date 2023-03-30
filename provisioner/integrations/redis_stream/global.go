package redis_stream

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"strings"
	"time"

	"github.com/porter-dev/porter/internal/analytics"

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
				config.Logger.Debug().Msg("skipping message parsing as id does not exist")
				continue
			}

			workspaceID, ok := id.(string)

			if !ok {
				config.Logger.Debug().Msg("skipping message parsing as workspace id does not exist")
				continue
			}

			// parse the id to identify the infra
			name, err := models.ParseWorkspaceID(workspaceID)
			if err != nil {
				config.Logger.Debug().Msg(fmt.Sprintf("could not parse workspace ID: %s %s", workspaceID, err.Error()))
				continue
			}

			config.Logger.Debug().Msg(fmt.Sprintf("reading infra %d and operation %s for project %d", name.InfraID, name.OperationUID, name.ProjectID))

			infra, err := repo.Infra().ReadInfra(name.ProjectID, name.InfraID)
			if err != nil {
				config.Logger.Debug().Msg(fmt.Sprintf("could not read infra %d in project %d: %s", name.InfraID, name.ProjectID, err.Error()))
				continue
			}

			operation, err := repo.Infra().ReadOperation(name.InfraID, name.OperationUID)
			if err != nil {
				config.Logger.Debug().Msg(fmt.Sprintf("could not read operation %s, infra %d in project %d: %s", name.OperationUID, name.InfraID, name.ProjectID, err.Error()))
				continue
			}

			statusVal, exists := msg.Values["status"]

			if !exists {
				config.Logger.Debug().Msg("skipping message parsing as status does not exist")
				continue
			}

			config.Logger.Debug().Msg(fmt.Sprintf("pushing state and log file for %s with status %v", workspaceID, statusVal))

			switch fmt.Sprintf("%v", statusVal) {
			case "created", "error", "destroyed":
				err := cleanupOperation(config, client, infra, operation, workspaceID)
				if err != nil {
					config.Alerter.SendAlert(context.Background(), err, map[string]interface{}{
						"workspace_id": workspaceID,
					})
				}
			}
		}
	}
}

func cleanupOperation(config *config.Config, client *redis.Client, infra *models.Infra, operation *models.Operation, workspaceID string) error {
	l := config.Logger
	l.Debug().Msg(fmt.Sprintf("pushing state for %s", workspaceID))

	err := pushNewStateToStorage(config, client, infra, operation, workspaceID)
	if err != nil {
		return err
	}

	l.Debug().Msg(fmt.Sprintf("cleaning state stream for %s", workspaceID))

	err = cleanupStateStream(config, client, workspaceID)

	if err != nil {
		return nil
	}

	l.Debug().Msg(fmt.Sprintf("pushing logs for %s", workspaceID))

	err = pushLogsToStorage(config, client, infra, workspaceID)

	if err != nil {
		return err
	}

	l.Debug().Msg(fmt.Sprintf("cleaning logs for %s", workspaceID))

	err = cleanupLogStream(config, client, infra, workspaceID)

	if err != nil {
		return err
	}

	return nil
}

func pushNewStateToStorage(config *config.Config, client *redis.Client, infra *models.Infra, operation *models.Operation, workspaceID string) error {
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

	currState.OperationID = operation.UID
	currState.LastUpdated = time.Now()

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

			stateData := &types.TFResourceStateEntry{}

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

			// the state data requires at least a name and status to be valid
			if stateData.ID != "" && stateData.Status != "" {
				// if the state is deleted, remove it from the current state
				if stateData.Status == types.TFResourceDeleted {
					delete(currState.Resources, stateData.ID)
				} else {
					// if the state data already exists, update the updated_at and status fields
					if _, exists := currState.Resources[stateData.ID]; exists {
						// currState.Resources[stateData.ID].UpdatedAt = time.
						currState.Resources[stateData.ID].UpdatedAt = stateData.PushedAt
						currState.Resources[stateData.ID].Status = stateData.Status
						currState.Resources[stateData.ID].Error = stateData.Error
					} else {
						currState.Resources[stateData.ID] = stateData.TFResourceState
						currState.Resources[stateData.ID].CreatedAt = stateData.PushedAt
						currState.Resources[stateData.ID].UpdatedAt = stateData.PushedAt
					}
				}
			}
		}
	}

	// determine the status of the operation based on the resources
	currState.Status = getOperationStatus(currState.Status, currState.Resources)

	// push the new state to S3
	newStateBytes, err := json.Marshal(currState)
	if err != nil {
		return err
	}

	return config.StorageManager.WriteFile(infra, "current_state.json", newStateBytes, true)
}

func getOperationStatus(oldState types.TFStateStatus, resources map[string]*types.TFResourceState) types.TFStateStatus {
	created := len(resources) >= 1
	deleted := oldState != types.TFStateStatusDeleted
	errored := false

	for _, resource := range resources {
		created = created && resource.Status == types.TFResourceCreated && resource.Error == nil
		deleted = deleted && resource.Status == types.TFResourceDeleted && resource.Error == nil
		errored = errored || resource.Error != nil
	}

	if created {
		return types.TFStateStatusCreated
	} else if deleted {
		return types.TFStateStatusDeleted
	} else if errored {
		return types.TFStateStatusErrored
	}

	// if unknown, return previous state status
	return oldState
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
