package porter_app

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

// UpdateAppRevisionStatusHandler handles requests to the /apps/{porter_app_name}/revisions/{app_revision_id} endpoint
type UpdateAppRevisionStatusHandler struct {
	handlers.PorterHandlerReadWriter
}

// NewUpdateAppRevisionStatusHandler returns a new UpdateAppRevisionStatusHandler
func NewUpdateAppRevisionStatusHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *UpdateAppRevisionStatusHandler {
	return &UpdateAppRevisionStatusHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

// UpdateAppRevisionStatusRequest is the request object for the /apps/{porter_app_name}/revisions/{app_revision_id} endpoint
type UpdateAppRevisionStatusRequest struct {
	// Status is the new status to set for the app revision
	Status models.AppRevisionStatus `json:"status"`
}

// UpdateAppRevisionStatusResponse is the response object for the /apps/{porter_app_name}/revisions/{app_revision_id} endpoint
type UpdateAppRevisionStatusResponse struct{}

// UpdateAppRevisionStatus updates the status of an app revision
func (c *UpdateAppRevisionStatusHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-update-app-revision-status")
	defer span.End()

	project, _ := ctx.Value(types.ProjectScope).(*models.Project)

	// read the request object from the decoder
	request := &UpdateAppRevisionStatusRequest{}
	if ok := c.DecodeAndValidate(w, r, request); !ok {
		err := telemetry.Error(ctx, span, nil, "error decoding request")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	if request.Status == "" {
		err := telemetry.Error(ctx, span, nil, "status cannot be empty")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	appRevisionId, _ := requestutils.GetURLParamString(r, types.URLParamAppRevisionID)
	if appRevisionId == "" {
		err := telemetry.Error(ctx, span, nil, "app revision id is empty")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	if appRevisionId == "" {
		err := telemetry.Error(ctx, span, nil, "app revision id is empty")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	var statusProto porterv1.EnumRevisionStatus
	switch request.Status {
	case models.AppRevisionStatus_BuildFailed:
		statusProto = porterv1.EnumRevisionStatus_ENUM_REVISION_STATUS_BUILD_FAILED
	case models.AppRevisionStatus_InstallFailed:
		statusProto = porterv1.EnumRevisionStatus_ENUM_REVISION_STATUS_DEPLOY_FAILED
	case models.AppRevisionStatus_PredeployFailed:
		statusProto = porterv1.EnumRevisionStatus_ENUM_REVISION_STATUS_PREDEPLOY_FAILED
	case models.AppRevisionStatus_BuildSuccessful:
		statusProto = porterv1.EnumRevisionStatus_ENUM_REVISION_STATUS_BUILD_SUCCESSFUL
	default:
		err := telemetry.Error(ctx, span, nil, "invalid status")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	updateStatusReq := connect.NewRequest(&porterv1.UpdateRevisionStatusRequest{
		ProjectId:      int64(project.ID),
		AppRevisionId:  appRevisionId,
		RevisionStatus: statusProto,
	})

	_, err := c.Config().ClusterControlPlaneClient.UpdateRevisionStatus(ctx, updateStatusReq)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error updating revision status")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	res := &UpdateAppRevisionStatusResponse{}
	c.WriteResult(w, r, res)
}
