package porter_app

import (
	"net/http"

	"connectrpc.com/connect"
	"github.com/google/uuid"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
)

// RollbackAppRevisionHandler rolls back an app revision to the last deployed revision
type RollbackAppRevisionHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

// NewRollbackAppRevisionHandler returns a new RollbackAppRevisionHandler
func NewRollbackAppRevisionHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *RollbackAppRevisionHandler {
	return &RollbackAppRevisionHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

// RollbackAppRevisionRequest is the request body for the /apps/{porter_app_name}/rollback endpoint
type RollbackAppRevisionRequest struct {
	DeploymentTargetID string `json:"deployment_target_id"`
	AppRevisionID      string `json:"app_revision_id"`
}

// RollbackAppRevisionResponse is the response body for the /apps/{porter_app_name}/rollback endpoint
type RollbackAppRevisionResponse struct {
	TargetRevisionNumber int `json:"target_revision_number"`
}

// ServeHTTP handles the request and rolls back the app revision
func (c *RollbackAppRevisionHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-rollback-app-revision")
	defer span.End()

	project, _ := ctx.Value(types.ProjectScope).(*models.Project)
	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)

	if !project.GetFeatureFlag(models.ValidateApplyV2, c.Config().LaunchDarklyClient) {
		err := telemetry.Error(ctx, span, nil, "project does not have validate apply v2 enabled")
		c.HandleAPIError(w, r, apierrors.NewErrForbidden(err))
		return
	}

	request := &RollbackAppRevisionRequest{}
	if ok := c.DecodeAndValidate(w, r, request); !ok {
		err := telemetry.Error(ctx, span, nil, "error decoding request")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	deploymentTargetID, err := uuid.Parse(request.DeploymentTargetID)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error parsing deployment target id")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	if deploymentTargetID == uuid.Nil {
		err := telemetry.Error(ctx, span, nil, "deployment target id is nil")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	appName, reqErr := requestutils.GetURLParamString(r, types.URLParamPorterAppName)
	if reqErr != nil {
		err := telemetry.Error(ctx, span, nil, "error parsing porter app name")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "application-name", Value: appName})

	app, err := c.Repo().PorterApp().ReadPorterAppByName(cluster.ID, appName)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error reading porter app by name")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}
	if app.ID == 0 {
		err = telemetry.Error(ctx, span, nil, "app with name does not exist in project")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	rollbackReq := connect.NewRequest(&porterv1.RollbackRevisionRequest{
		ProjectId:          int64(project.ID),
		AppId:              int64(app.ID),
		DeploymentTargetId: deploymentTargetID.String(),
		AppRevisionId:      request.AppRevisionID,
	})
	ccpResp, err := c.Config().ClusterControlPlaneClient.RollbackRevision(ctx, rollbackReq)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error calling ccp rollback porter app")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	if ccpResp == nil {
		err := telemetry.Error(ctx, span, err, "ccp resp is nil")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}
	if ccpResp.Msg == nil {
		err := telemetry.Error(ctx, span, err, "ccp resp msg is nil")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}
	if ccpResp.Msg.TargetRevisionNumber == 0 {
		err := telemetry.Error(ctx, span, err, "ccp resp target revision number is 0")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	c.WriteResult(w, r, &RollbackAppRevisionResponse{
		TargetRevisionNumber: int(ccpResp.Msg.TargetRevisionNumber),
	})
}
