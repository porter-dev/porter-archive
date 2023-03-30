package grpc

import (
	"fmt"

	"github.com/porter-dev/porter/provisioner/integrations/redis_stream"
	"github.com/porter-dev/porter/provisioner/pb"

	ptypes "github.com/porter-dev/porter/provisioner/types"
)

func (s *ProvisionerServer) GetStateUpdate(infra *pb.Infra, server pb.Provisioner_GetStateUpdateServer) error {
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

	sendFnc := func(update *ptypes.TFResourceState) error {
		res := &pb.StateUpdate{
			ResourceId: update.ID,
			Status:     string(update.Status),
		}

		res.Error = ""

		if update != nil && update.Error != nil {
			res.Error = *update.Error
		}

		return server.Send(res)
	}

	return redis_stream.StreamStateUpdate(server.Context(), s.config.RedisClient, modelInfra, operation, sendFnc)
}
