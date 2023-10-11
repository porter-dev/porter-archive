package porter_app

import (
	"context"
	"fmt"
	"net/http"

	"connectrpc.com/connect"
	"github.com/google/uuid"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/api-contracts/generated/go/porter/v1/porterv1connect"
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
	AppRevisionID string `json:"app_revision_id"`
}

// ServeHTTP handles the request and rolls back the app revision
func (c *RollbackAppRevisionHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-rollback-app-revision")
	defer span.End()

	project, _ := ctx.Value(types.ProjectScope).(*models.Project)
	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "project-id", Value: project.ID},
		telemetry.AttributeKV{Key: "cluster-id", Value: cluster.ID},
	)

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

	var targetProto *porterv1.PorterApp
	if request.AppRevisionID != "" {
		targetProto, err = getRevisionProto(ctx, getRevisionProtoInput{
			projectID:     int64(project.ID),
			appRevisionID: request.AppRevisionID,
			ccpClient:     c.Config().ClusterControlPlaneClient,
		})
		if err != nil {
			err = telemetry.Error(ctx, span, err, "error getting revision proto")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}
	} else {
		targetProto, err = getLastDeployedProto(ctx, getLastDeployedProtoInput{
			appName:            appName,
			projectID:          int64(project.ID),
			deploymentTargetID: deploymentTargetID,
			ccpClient:          c.Config().ClusterControlPlaneClient,
		})
		if err != nil {
			err = telemetry.Error(ctx, span, err, "error getting last deployed proto")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}
	}

	applyReq := connect.NewRequest(&porterv1.ApplyPorterAppRequest{
		ProjectId:           int64(project.ID),
		DeploymentTargetId:  deploymentTargetID.String(),
		App:                 targetProto,
		PorterAppRevisionId: "",
		ForceBuild:          false,
	})
	ccpResp, err := c.Config().ClusterControlPlaneClient.ApplyPorterApp(ctx, applyReq)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error calling ccp apply porter app")
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

	if ccpResp.Msg.PorterAppRevisionId == "" {
		err := telemetry.Error(ctx, span, err, "ccp resp app revision id is nil")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "resp-app-revision-id", Value: ccpResp.Msg.PorterAppRevisionId})

	if ccpResp.Msg.CliAction == porterv1.EnumCLIAction_ENUM_CLI_ACTION_UNSPECIFIED {
		err := telemetry.Error(ctx, span, err, "ccp resp cli action is nil")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}
	if ccpResp.Msg.CliAction != porterv1.EnumCLIAction_ENUM_CLI_ACTION_NONE {
		err := telemetry.Error(ctx, span, err, "ccp resp cli action is not none")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	c.WriteResult(w, r, &RollbackAppRevisionResponse{
		AppRevisionID: ccpResp.Msg.PorterAppRevisionId,
	})
}

type getRevisionProtoInput struct {
	projectID     int64
	appRevisionID string
	ccpClient     porterv1connect.ClusterControlPlaneServiceClient
}

func getRevisionProto(ctx context.Context, inp getRevisionProtoInput) (*porterv1.PorterApp, error) {
	ctx, span := telemetry.NewSpan(ctx, "get-revision-proto")
	defer span.End()

	var proto *porterv1.PorterApp

	if inp.projectID == 0 {
		return proto, telemetry.Error(ctx, span, nil, "project id is empty")
	}
	if inp.appRevisionID == "" {
		return proto, telemetry.Error(ctx, span, nil, "app revision id is empty")
	}
	if inp.ccpClient == nil {
		return proto, telemetry.Error(ctx, span, nil, "cluster control plane client is nil")
	}

	getRevisionReq := connect.NewRequest(&porterv1.GetAppRevisionRequest{
		ProjectId:     inp.projectID,
		AppRevisionId: inp.appRevisionID,
	})
	ccpResp, err := inp.ccpClient.GetAppRevision(ctx, getRevisionReq)
	if err != nil {
		return proto, telemetry.Error(ctx, span, err, "error getting app revision")
	}

	if ccpResp == nil || ccpResp.Msg == nil {
		return proto, telemetry.Error(ctx, span, nil, "get app revision response is nil")
	}

	proto = ccpResp.Msg.AppRevision.App
	if proto == nil {
		return proto, telemetry.Error(ctx, span, nil, "app revision proto is nil")
	}

	return proto, nil
}

type getLastDeployedProtoInput struct {
	appName            string
	projectID          int64
	deploymentTargetID uuid.UUID
	ccpClient          porterv1connect.ClusterControlPlaneServiceClient
}

func getLastDeployedProto(ctx context.Context, inp getLastDeployedProtoInput) (*porterv1.PorterApp, error) {
	ctx, span := telemetry.NewSpan(ctx, "rollback-to-last-deployed-revision")
	defer span.End()

	var proto *porterv1.PorterApp

	if inp.appName == "" {
		return proto, telemetry.Error(ctx, span, nil, "app name is empty")
	}
	if inp.projectID == 0 {
		return proto, telemetry.Error(ctx, span, nil, "project id is empty")
	}
	if inp.deploymentTargetID == uuid.Nil {
		return proto, telemetry.Error(ctx, span, nil, "deployment target id is empty")
	}
	if inp.ccpClient == nil {
		return proto, telemetry.Error(ctx, span, nil, "cluster control plane client is nil")
	}

	listAppRevisionsReq := connect.NewRequest(&porterv1.LatestAppRevisionsRequest{
		ProjectId:          inp.projectID,
		DeploymentTargetId: inp.deploymentTargetID.String(),
	})

	latestAppRevisionsResp, err := inp.ccpClient.LatestAppRevisions(ctx, listAppRevisionsReq)
	if err != nil {
		return proto, telemetry.Error(ctx, span, err, "error getting latest app revisions")
	}

	if latestAppRevisionsResp == nil || latestAppRevisionsResp.Msg == nil {
		return proto, telemetry.Error(ctx, span, nil, "latest app revisions response is nil")
	}

	revisions := latestAppRevisionsResp.Msg.AppRevisions
	if len(revisions) == 0 {
		return proto, telemetry.Error(ctx, span, nil, "no revisions found for app")
	}

	skip := 0
	if revisions[0].RevisionNumber != 0 {
		skip = 1
	}
	if len(revisions) <= skip {
		return proto, telemetry.Error(ctx, span, nil, "no previous successful revisions found for app")
	}

	for _, rev := range revisions[skip:] {
		if rev.RevisionNumber != 0 {
			proto = rev.App
			break
		}
	}
	if proto == nil {
		return proto, fmt.Errorf("no previous successful revisions found for app %s", inp.appName)
	}

	return proto, nil
}
