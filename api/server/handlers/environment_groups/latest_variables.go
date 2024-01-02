package environment_groups

import (
	"net/http"

	"connectrpc.com/connect"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
)

// LatestEnvGroupVariablesHandler is the handler for the /projects/{project_id}/clusters/{cluster_id}/environment-groups/{env_group_name}/latest endpoint
type LatestEnvGroupVariablesHandler struct {
	handlers.PorterHandlerReadWriter
}

// NewLatestEnvGroupVariablesHandler handles GET requests to /projects/{project_id}/clusters/{cluster_id}/environment-groups/{env_group_name}/latest
func NewLatestEnvGroupVariablesHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *LatestEnvGroupVariablesHandler {
	return &LatestEnvGroupVariablesHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

// LatestEnvGroupVariablesRequest is the request object for the /projects/{project_id}/clusters/{cluster_id}/environment-groups/{env_group_name}/latest endpoint
type LatestEnvGroupVariablesRequest struct{}

// LatestEnvGroupVariablesResponse is the response object for the /projects/{project_id}/clusters/{cluster_id}/environment-groups/{env_group_name}/latest endpoint
type LatestEnvGroupVariablesResponse struct {
	Variables map[string]string `json:"variables"`
	Secrets   map[string]string `json:"secrets"`
}

// ServeHTTP retrieves the latest env group variables from CCP and writes them to the response
func (c *LatestEnvGroupVariablesHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-get-latest-env-group-variables")
	defer span.End()

	project, _ := ctx.Value(types.ProjectScope).(*models.Project)
	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)

	envGroupName, reqErr := requestutils.GetURLParamString(r, types.URLParamEnvGroupName)
	if reqErr != nil {
		err := telemetry.Error(ctx, span, reqErr, "error parsing env group name from url")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	latestVariablesReq := connect.NewRequest(&porterv1.LatestEnvGroupWithVariablesRequest{
		ProjectId:    int64(project.ID),
		ClusterId:    int64(cluster.ID),
		EnvGroupName: envGroupName,
	})

	ccpResp, err := c.Config().ClusterControlPlaneClient.LatestEnvGroupWithVariables(ctx, latestVariablesReq)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error getting env group variables from ccp")
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	if ccpResp == nil || ccpResp.Msg == nil {
		err := telemetry.Error(ctx, span, nil, "ccp returned nil response")
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}
	if ccpResp.Msg.EnvGroupVariables == nil {
		err := telemetry.Error(ctx, span, nil, "no env variables returned")
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	res := &LatestEnvGroupVariablesResponse{
		Variables: ccpResp.Msg.EnvGroupVariables.Normal,
		Secrets:   ccpResp.Msg.EnvGroupVariables.Secret,
	}

	c.WriteResult(w, r, res)
}
