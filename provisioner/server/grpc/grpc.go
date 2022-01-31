package grpc

import (
	"github.com/porter-dev/porter/provisioner/pb"
	"github.com/porter-dev/porter/provisioner/server/config"
)

type ProvisionerServer struct {
	pb.UnimplementedProvisionerServer

	config *config.Config
}

func NewProvisionerServer(config *config.Config) *ProvisionerServer {
	return &ProvisionerServer{
		config: config,
	}
}
