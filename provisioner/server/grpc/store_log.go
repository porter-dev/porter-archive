package grpc

import (
	"fmt"
	"io"
	"strings"

	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/provisioner/integrations/redis_stream"
	"github.com/porter-dev/porter/provisioner/pb"
	"github.com/porter-dev/porter/provisioner/types"

	"google.golang.org/grpc/metadata"
)

func (s *ProvisionerServer) StoreLog(stream pb.Provisioner_StoreLogServer) error {
	// read metadata to get infra object
	streamContext, ok := metadata.FromIncomingContext(stream.Context())

	if !ok {
		return fmt.Errorf("unauthorized")
	}

	workspaceID, exists := streamContext["workspace_id"]

	if !exists || len(workspaceID) != 1 {
		return fmt.Errorf("unauthorized")
	}

	// parse workspace id
	name, err := models.ParseWorkspaceID(workspaceID[0])

	if err != nil {
		return err
	}

	infra, err := s.config.Repo.Infra().ReadInfra(name.ProjectID, name.InfraID)

	if err != nil {
		return err
	}

	operation, err := s.config.Repo.Infra().ReadOperation(name.InfraID, name.OperationUID)

	if err != nil {
		return err
	}

	for {
		tfLog, err := stream.Recv()

		if err == io.EOF {
			// push to the global stream
			err := redis_stream.PushToGlobalStream(s.config.RedisClient, infra, operation, "created")

			if err != nil {
				return err
			}

			return stream.SendAndClose(&pb.TerraformStateMeta{})
		} else if err != nil {
			return err
		}

		// determine whether to update the state based on the log
		if tfLog.Type != pb.TerraformEvent_OPERATION_FINISHED {
			logType := types.ToProvisionerType(tfLog)

			err := redis_stream.PushToLogStream(s.config.RedisClient, infra, operation, logType)

			if err != nil {
				return err
			}

			stateUpdate := &types.TFResourceState{}

			switch logType.Type {
			case types.ApplyComplete:
				stateUpdate.ID = logType.Hook.Resource.Addr
				stateUpdate.Status = types.TFResourceCreated
			case types.PlannedChange:
				stateUpdate.ID = logType.Change.Resource.Addr

				if logType.Change.Action == "create" {
					stateUpdate.Status = types.TFResourcePlannedCreate
				} else if logType.Change.Action == "delete" {
					stateUpdate.Status = types.TFResourcePlannedDelete
				} else if logType.Change.Action == "update" {
					stateUpdate.Status = types.TFResourcePlannedUpdate
				}
			case types.Diagnostic:
				stateUpdate.ID = logType.Diagnostic.Address
				stateUpdate.Status = types.TFResourceErrored

				var errMsg string

				if logType.Diagnostic.Detail != "" {
					errMsg = logType.Diagnostic.Detail
				} else {
					errMsg = logType.Diagnostic.Summary
				}

				errMsg = strings.TrimSuffix(errMsg, "\n")

				stateUpdate.Error = &errMsg
			}

			if stateUpdate.ID != "" && stateUpdate.Status != "" {
				err = redis_stream.PushToOperationStream(s.config.RedisClient, infra, operation, stateUpdate)

				if err != nil {
					return err
				}
			}
		}
	}
}
