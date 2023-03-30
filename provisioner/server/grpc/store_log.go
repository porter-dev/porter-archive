package grpc

import (
	"fmt"
	"io"
	"strings"

	"github.com/porter-dev/porter/provisioner/integrations/redis_stream"
	"github.com/porter-dev/porter/provisioner/pb"
	"github.com/porter-dev/porter/provisioner/types"
)

func (s *ProvisionerServer) StoreLog(stream pb.Provisioner_StoreLogServer) error {
	name, ok := verifyPorterTokenContext(s.config, stream.Context())

	if !ok {
		return fmt.Errorf("unauthorized")
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
			return stream.SendAndClose(&pb.TerraformStateMeta{})
		} else if err != nil {
			return err
		}

		logType := types.ToProvisionerType(tfLog)

		err = redis_stream.PushToLogStream(s.config.RedisClient, infra, operation, logType)

		if err != nil {
			return err
		}

		stateUpdate := &types.TFResourceState{}

		switch logType.Type {
		case types.ApplyComplete:
			stateUpdate.ID = logType.Hook.Resource.Addr

			if logType.Hook.Action == "create" {
				stateUpdate.Status = types.TFResourceCreated
			} else if logType.Hook.Action == "delete" {
				stateUpdate.Status = types.TFResourceDeleted
			}
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
				errMsg = fmt.Sprintf("%s: %s", logType.Message, logType.Diagnostic.Detail)
			} else if logType.Diagnostic.Summary != "" {
				errMsg = fmt.Sprintf("%s: %s", logType.Message, logType.Diagnostic.Summary)
			} else {
				errMsg = fmt.Sprintf("%s", logType.Message)
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
