package grpc

import (
	"fmt"

	"github.com/porter-dev/porter/provisioner/integrations/redis_stream"
	"github.com/porter-dev/porter/provisioner/pb"
)

func (s *ProvisionerServer) GetLog(infra *pb.Infra, server pb.Provisioner_GetLogServer) error {
	name, ok := verifyStaticTokenContext(s.config, server.Context())

	if !ok {
		return fmt.Errorf("unauthorized")
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

	return redis_stream.StreamOperationLogs(server.Context(), s.config.RedisClient, modelInfra, operation, sendFnc)
}
