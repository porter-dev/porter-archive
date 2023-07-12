package authmanagement

import (
	"context"
	"errors"

	"github.com/bufbuild/connect-go"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
)

// PorterAgentConnection returns all the information necessary for a porter agent to connect to the server url
func (a AuthManagementServer) PorterAgentConnection(ctx context.Context, req *connect.Request[porterv1.PorterAgentConnectionRequest]) (*connect.Response[porterv1.PorterAgentConnectionResponse], error) {
	return nil, connect.NewError(connect.CodeUnimplemented, errors.New("porter.v1.AuthManagementService.PorterAgentConnection is not implemented"))
}
