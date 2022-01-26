package grpc

import (
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/provisioner/integrations/redis_stream"
	"github.com/porter-dev/porter/provisioner/pb"
	"gorm.io/gorm"

	ptypes "github.com/porter-dev/porter/provisioner/types"
)

func (s *ProvisionerServer) GetState(infra *pb.Infra, server pb.Provisioner_GetStateUpdateServer) error {
	// TODO: change this to read the workspace_id passed in through metadata -- remove infra *pb.Infra call
	modelInfra := &models.Infra{
		Model: gorm.Model{
			ID: 1,
		},
		Kind:      "test",
		Suffix:    "123456",
		ProjectID: 1,
	}

	modelOperation := &models.Operation{
		Model: gorm.Model{
			ID: 1,
		},
		UID:     "0123456789",
		InfraID: 1,
		Type:    "apply",
		Status:  "creating",
	}

	sendFnc := func(update *ptypes.TFResourceState) error {
		return server.Send(&pb.StateUpdate{
			ResourceId: update.ID,
			Status:     string(update.Status),
			Error:      *update.Error,
		})
	}

	// TODO: CASE ON THE OPERATION BEING COMPLETED AND THUS THE STREAM BEING DELETED
	return redis_stream.StreamStateUpdate(server.Context(), s.config.RedisClient, modelInfra, modelOperation, sendFnc)
}
