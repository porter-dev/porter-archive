package porter_app

import (
	"net/http"

	"connectrpc.com/connect"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
)

// UpdateAppBuildSettingsHandler handles requests to the POST /apps/{porter_app_name}/build endpoint
type UpdateAppBuildSettingsHandler struct {
	handlers.PorterHandlerReadWriter
}

// NewUpdateAppBuildSettingsHandler returns a new UpdateAppBuildSettingsHandler
func NewUpdateAppBuildSettingsHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *UpdateAppBuildSettingsHandler {
	return &UpdateAppBuildSettingsHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

// UpdateAppBuildSettingsRequest is the request object for the POST /apps/{porter_app_name}/build endpoint
type UpdateAppBuildSettingsRequest struct {
	BuildSettings BuildSettings `json:"build_settings"`
}

// UpdateAppBuildSettingsResponse is the response object for the POST /apps/{porter_app_name}/build endpoint
type UpdateAppBuildSettingsResponse struct{}

func (c *UpdateAppBuildSettingsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-update-app-build-settings")
	defer span.End()

	project, _ := ctx.Value(types.ProjectScope).(*models.Project)

	// read the request object from the decoder
	request := &UpdateAppBuildSettingsRequest{}
	if ok := c.DecodeAndValidate(w, r, request); !ok {
		err := telemetry.Error(ctx, span, nil, "error decoding request")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	updateReq := connect.NewRequest(&porterv1.UpdateAppBuildSettingsRequest{
		ProjectId: int64(project.ID),
		Build: &porterv1.Build{
			Method:     request.BuildSettings.Method,
			Context:    request.BuildSettings.Context,
			Dockerfile: request.BuildSettings.Dockerfile,
			Builder:    request.BuildSettings.Builder,
			Buildpacks: request.BuildSettings.Buildpacks,
			CommitSha:  request.BuildSettings.CommitSHA,
		},
	})

	ccpResp, err := c.Config().ClusterControlPlaneClient.UpdateAppBuildSettings(ctx, updateReq)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error updating app build settings")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	if ccpResp == nil || ccpResp.Msg == nil {
		err := telemetry.Error(ctx, span, nil, "ccp response is nil")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	c.WriteResult(w, r, &UpdateAppBuildSettingsResponse{})
}
