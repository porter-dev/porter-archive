package grpc

import "github.com/porter-dev/porter/provisioner/pb"

func (s *ProvisionerServer) GetState(infra *pb.Infra, server pb.Provisioner_GetStateUpdateServer) error {
	// TODO: listen to Redis, send updates via `server.Send`

	return nil
}
