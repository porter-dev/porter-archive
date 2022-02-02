package grpc

import (
	"fmt"

	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/provisioner/integrations/redis_stream"
	"github.com/porter-dev/porter/provisioner/pb"
	"google.golang.org/grpc/metadata"
)

func (s *ProvisionerServer) GetLog(infra *pb.Infra, server pb.Provisioner_GetLogServer) error {
	// read metadata to get infra object
	streamContext, ok := metadata.FromIncomingContext(server.Context())

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

	modelInfra, err := s.config.Repo.Infra().ReadInfra(name.ProjectID, name.InfraID)

	if err != nil {
		return err
	}

	operation, err := s.config.Repo.Infra().ReadOperation(name.InfraID, name.OperationUID)

	if err != nil {
		return err
	}

	// if the operation is completed, close the connection
	if operation.Status == "completed" {
		return nil
	}

	sendFnc := func(log string) error {
		return server.Send(&pb.LogString{
			Log: log,
		})
	}

	// TODO: CASE ON THE OPERATION BEING COMPLETED AND THUS THE STREAM BEING DELETED
	return redis_stream.StreamOperationLogs(server.Context(), s.config.RedisClient, modelInfra, operation, sendFnc)
}
