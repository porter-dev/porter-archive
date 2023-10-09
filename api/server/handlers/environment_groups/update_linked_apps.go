package environment_groups

import (
	"net/http"

	"connectrpc.com/connect"

	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
)

// UpdateLinkedAppsHandler is the handle for the /environment-group/update-linked-apps endpoint
type UpdateLinkedAppsHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

// NewUpdateLinkedAppsHandler creates an instance of UpdateLinkedAppsHandler
func NewUpdateLinkedAppsHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *UpdateLinkedAppsHandler {
	return &UpdateLinkedAppsHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

// UpdateLinkedAppsRequest is the request object for the /environment-group/update-linked-apps endpoint
type UpdateLinkedAppsRequest struct {
	Name string `json:"name"`
}

// UpdateLinkedAppsResponse is the response object for the /environment-group/update-linked-apps endpoint
type UpdateLinkedAppsResponse struct{}

// ServeHTTP updates all apps linked to an environment group
func (c *UpdateLinkedAppsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-update-apps-linked-to-env-group")
	defer span.End()

	project, _ := ctx.Value(types.ProjectScope).(*models.Project)
	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)

	if !project.GetFeatureFlag(models.ValidateApplyV2, c.Config().LaunchDarklyClient) {
		err := telemetry.Error(ctx, span, nil, "project does not have validate apply v2 enabled")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusForbidden))
		return
	}

	request := &UpdateLinkedAppsRequest{}
	if ok := c.DecodeAndValidate(w, r, request); !ok {
		err := telemetry.Error(ctx, span, nil, "error decoding request")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "env-group-name", Value: request.Name})

	updateLinkedAppsReq := connect.NewRequest(&porterv1.UpdateAppsLinkedToEnvGroupRequest{
		ProjectId:    int64(project.ID),
		ClusterId:    int64(cluster.ID),
		EnvGroupName: request.Name,
	})
	_, err := c.Config().ClusterControlPlaneClient.UpdateAppsLinkedToEnvGroup(ctx, updateLinkedAppsReq)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error calling ccp update porter app image")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	res := &UpdateLinkedAppsResponse{}

	c.WriteResult(w, r, res)
}
