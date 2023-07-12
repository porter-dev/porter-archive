package authmanagement

import (
	"context"

	"github.com/bufbuild/connect-go"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/porter/internal/auth/token"
	"github.com/porter-dev/porter/internal/telemetry"
)

// PorterAgentConnection returns all the information necessary for a porter agent to connect to the server url
func (a AuthManagementServer) PorterAgentConnection(ctx context.Context, req *connect.Request[porterv1.PorterAgentConnectionRequest]) (*connect.Response[porterv1.PorterAgentConnectionResponse], error) {
	ctx, span := telemetry.NewSpan(ctx, "endpoint-auth-management-porter-agent-connection")
	defer span.End()

	resp := connect.NewResponse(&porterv1.PorterAgentConnectionResponse{})
	if req.Msg == nil {
		return resp, telemetry.Error(ctx, span, nil, "no message received")
	}

	if req.Msg.ProjectId == 0 {
		return resp, telemetry.Error(ctx, span, nil, "must provide a projectID")
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "project-id", Value: req.Msg.ProjectId})

	if req.Msg.ClusterId == 0 {
		return resp, telemetry.Error(ctx, span, nil, "must provide a clusterID")
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "cluster-id", Value: req.Msg.ClusterId})

	jwt, err := token.GetTokenForAPI(1, uint(req.Msg.ProjectId))
	if err != nil {
		return resp, telemetry.Error(ctx, span, err, "failed to get porter-agent api token")
	}

	encoded, err := jwt.EncodeToken(a.Config.TokenConf)
	if err != nil {
		return resp, telemetry.Error(ctx, span, err, "failed to encode porter-agent api token")
	}

	resp.Msg.Token = encoded
	resp.Msg.ServerUrl = a.Config.ServerConf.ServerURL
	resp.Msg.Port = int64(a.Config.ServerConf.Port)

	return resp, nil
}
