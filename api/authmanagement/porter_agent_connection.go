package authmanagement

import (
	"context"
	"errors"

	"github.com/bufbuild/connect-go"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
)

// APIToken returns an encoded token for programmatic access to the Porter UI
func (a AuthManagementServer) APIToken(ctx context.Context, req *connect.Request[porterv1.APITokenRequest]) (*connect.Response[porterv1.APITokenResponse], error) {
	return nil, connect.NewError(connect.CodeUnimplemented, errors.New("porter.v1.AuthManagementService.APIToken is not implemented"))
}
