package redis_stream

import (
	"context"
	"encoding/json"
	"fmt"

	redis "github.com/go-redis/redis/v8"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/provisioner/types"
)

func PushToOperationStream(
	client *redis.Client,
	infra *models.Infra,
	operation *models.Operation,
	data *types.TFResourceState,
) error {
	// pushes a state update to the state stream
	streamName := getStateStreamName(infra, operation)

	dataBytes, err := json.Marshal(data)

	if err != nil {
		return err
	}

	_, err = client.XAdd(context.TODO(), &redis.XAddArgs{
		Stream: streamName,
		ID:     "*",
		Values: map[string]interface{}{
			"id":   models.GetWorkspaceID(infra, operation),
			"data": dataBytes,
		},
	}).Result()

	return err
}

func PushToLogStream(
	client *redis.Client,
	infra *models.Infra,
	operation *models.Operation,
	data *types.TFLogLine,
) error {
	// pushes a state update to the state stream
	streamName := getLogsStreamName(infra, operation)

	_, err := client.XAdd(context.TODO(), &redis.XAddArgs{
		Stream: streamName,
		ID:     "*",
		Values: map[string]interface{}{
			"log": fmt.Sprintf("[%s] [%s] %s\n", data.Level, data.Timestamp, data.Message),
		},
	}).Result()

	return err
}

type StateUpdateWriter func(update *types.TFResourceState) error

func StreamStateUpdate(
	ctx context.Context,
	client *redis.Client,
	infra *models.Infra,
	operation *models.Operation,
	send StateUpdateWriter,
) error {
	fmt.Println("CALLED STREAM STATE UPDATE")
	lastID := "0-0"
	streamName := getStateStreamName(infra, operation)

	for {
		fmt.Println("waiting for xread...")

		xstream, err := client.XRead(
			ctx,
			&redis.XReadArgs{
				Streams: []string{streamName, lastID},
				Block:   0,
			},
		).Result()

		if err != nil {
			return err
		}

		messages := xstream[0].Messages
		lastID = messages[len(messages)-1].ID

		for _, msg := range messages {
			fmt.Println("READ MSG", msg)

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

			err = send(stateData)

			if err != nil {
				fmt.Println("GOT ERROR STATE", err)
				return err
			}
		}

		select {
		case <-ctx.Done():
			return nil
		default:
		}
	}
}

func getStateStreamName(
	infra *models.Infra,
	operation *models.Operation,
) string {
	return fmt.Sprintf("%s-state", models.GetWorkspaceID(infra, operation))
}

func getLogsStreamName(
	infra *models.Infra,
	operation *models.Operation,
) string {
	return fmt.Sprintf("%s-logs", models.GetWorkspaceID(infra, operation))
}

func getLogsFileName(
	infra *models.Infra,
	operation *models.Operation,
) string {
	return fmt.Sprintf("%s-logs.txt", models.GetWorkspaceID(infra, operation))
}
