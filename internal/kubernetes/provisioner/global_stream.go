package provisioner

import (
	"context"
	"fmt"

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

	if err != nil {
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
		">",
	).Result()

	return err
}

// ResourceCRUDHandler is a handler for updates to an infra resource
type ResourceCRUDHandler interface {
	OnCreate(id uint) error
}

// GlobalStreamListener performs an XREADGROUP operation on a given stream
// and sends a GlobalStreamMessage to the msgChan
func GlobalStreamListener(
	client *redis.Client,
	infraRepo repository.AWSInfraRepository,
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
			infraID, err := models.GetInfraIDFromWorkspaceID(fmt.Sprintf("%v", msg.Values["id"]))

			if fmt.Sprintf("%v", msg.Values["status"]) == "created" {
				infra, err := infraRepo.ReadAWSInfra(infraID)

				if err != nil {
					continue
				}

				infra.Status = models.StatusCreated

				infra, err = infraRepo.UpdateAWSInfra(infra)

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
