package grpc

import (
	"context"
	"strconv"

	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/provisioner/pb"
	"github.com/porter-dev/porter/provisioner/server/authn"
	"github.com/porter-dev/porter/provisioner/server/config"
	"google.golang.org/grpc/metadata"
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

func verifyStaticTokenContext(config *config.Config, ctx context.Context) (*models.UniqueNameWithOperation, bool) {
	streamContext, ok := metadata.FromIncomingContext(ctx)

	if !ok {
		return nil, false
	}

	tokenArr, exists := streamContext["token"]

	if !exists || len(tokenArr) != 1 {
		return nil, false
	}

	err := authn.ValidateStaticToken(config, tokenArr[0])
	if err != nil {
		return nil, false
	}

	workspaceID, exists := streamContext["workspace_id"]

	if !exists || len(workspaceID) != 1 {
		return nil, false
	}

	// parse workspace id
	name, err := models.ParseWorkspaceID(workspaceID[0])
	if err != nil {
		return nil, false
	}

	return name, true
}

func verifyPorterTokenContext(config *config.Config, ctx context.Context) (*models.UniqueNameWithOperation, bool) {
	streamContext, ok := metadata.FromIncomingContext(ctx)

	if !ok {
		return nil, false
	}

	// check token and token id
	tokenIDArr, exists := streamContext["token_id"]

	if !exists || len(tokenIDArr) != 1 {
		return nil, false
	}

	tokenID, err := strconv.ParseUint(tokenIDArr[0], 10, 64)
	if err != nil {
		return nil, false
	}

	tokenArr, exists := streamContext["token"]

	if !exists || len(tokenArr) != 1 {
		return nil, false
	}

	_, err = authn.ValidatePorterToken(config, uint(tokenID), tokenArr[0])

	if err != nil {
		return nil, false
	}

	workspaceID, exists := streamContext["workspace_id"]

	if !exists || len(workspaceID) != 1 {
		return nil, false
	}

	// parse workspace id
	name, err := models.ParseWorkspaceID(workspaceID[0])
	if err != nil {
		return nil, false
	}

	return name, true
}
