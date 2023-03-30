package redis_stream

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

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

	pushData := &types.TFResourceStateEntry{
		TFResourceState: data,
		PushedAt:        time.Now(),
	}

	dataBytes, err := json.Marshal(pushData)
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

func SendOperationCompleted(
	client *redis.Client,
	infra *models.Infra,
	operation *models.Operation,
) error {
	// pushes a state update to the state stream
	streamName := getStateStreamName(infra, operation)

	data := map[string]interface{}{
		"status": "OPERATION_COMPLETED",
	}

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
			"log": getLogString(data),
		},
	}).Result()

	return err
}

func getLogString(data *types.TFLogLine) string {
	if data.Diagnostic.Detail != "" {
		return fmt.Sprintf("[%s] [%s] %s: %s\n", data.Level, data.Timestamp, data.Message, data.Diagnostic.Detail)
	}

	return fmt.Sprintf("[%s] [%s] %s\n", data.Level, data.Timestamp, data.Message)
}

type LogWriter func(log string) error

func StreamOperationLogs(
	ctx context.Context,
	client *redis.Client,
	infra *models.Infra,
	operation *models.Operation,
	send LogWriter,
) error {
	streamName := getLogsStreamName(infra, operation)

	errorchan := make(chan error)
	redisCtx, cancel := context.WithCancel(context.Background())
	defer cancel()

	var wg sync.WaitGroup
	wg.Add(3)

	go func() {
		wg.Wait()
		close(errorchan)
	}()

	go func() {
		defer wg.Done()

		select {
		case <-ctx.Done():
			errorchan <- nil
		case <-redisCtx.Done():
			errorchan <- nil
		}
	}()

	go func() {
		defer wg.Done()

		// check intermittently that the stream still exists -- it may have been
		// cleaned up automatically
		failedCount := 0
		for {
			x, err := client.Exists(
				context.Background(),
				streamName,
			).Result()

			// if the stream does not exist, increment the failed counter
			if x == 0 || err != nil {
				failedCount++
			} else {
				failedCount = 0
			}

			if failedCount >= 2 {
				errorchan <- nil
				return
			}

			// wait 5 seconds in between pings
			time.Sleep(5 * time.Second)
		}
	}()

	go func() {
		defer wg.Done()

		lastID := "0-0"

		for {
			if redisCtx.Err() != nil {
				errorchan <- nil
				return
			}

			xstream, err := client.XRead(
				redisCtx,
				&redis.XReadArgs{
					Streams: []string{streamName, lastID},
					Block:   0,
				},
			).Result()
			if err != nil {
				errorchan <- err
				return
			}

			messages := xstream[0].Messages
			lastID = messages[len(messages)-1].ID

			for _, msg := range messages {
				dataInter, ok := msg.Values["log"]

				if !ok {
					continue
				}

				dataString, ok := dataInter.(string)

				if !ok {
					continue
				}

				err = send(dataString)

				if err != nil {
					errorchan <- err
					return
				}
			}
		}
	}()

	var err error

	for err = range errorchan {
		cancel()
	}

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
	streamName := getStateStreamName(infra, operation)

	errorchan := make(chan error)
	redisCtx, cancel := context.WithCancel(context.Background())
	defer cancel()

	var wg sync.WaitGroup
	wg.Add(3)

	go func() {
		wg.Wait()
		close(errorchan)
	}()

	go func() {
		defer wg.Done()

		select {
		case <-ctx.Done():
			errorchan <- nil
		case <-redisCtx.Done():
			errorchan <- nil
		}
	}()

	go func() {
		defer wg.Done()

		// check intermittently that the stream still exists -- it may have been
		// cleaned up automatically
		failedCount := 0
		for {
			x, err := client.Exists(
				context.Background(),
				streamName,
			).Result()

			// if the stream does not exist, increment the failed counter
			if x == 0 || err != nil {
				failedCount++
			} else {
				failedCount = 0
			}

			if failedCount >= 2 {
				errorchan <- nil
				return
			}

			// wait 5 seconds in between pings
			time.Sleep(5 * time.Second)
		}
	}()

	go func() {
		defer wg.Done()

		lastID := "0-0"

		for {
			if redisCtx.Err() != nil {
				errorchan <- nil
				return
			}

			xstream, err := client.XRead(
				ctx,
				&redis.XReadArgs{
					Streams: []string{streamName, lastID},
					Block:   0,
				},
			).Result()
			if err != nil {
				errorchan <- err
				return
			}

			messages := xstream[0].Messages
			lastID = messages[len(messages)-1].ID

			for _, msg := range messages {
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
					errorchan <- err
					return
				}
			}
		}
	}()

	var err error

	for err = range errorchan {
		cancel()
	}

	return err
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
