package porter_app

import (
	"context"
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

	var targetProto *porterv1.PorterApp
	var targetRevisionNumber int

	if request.AppRevisionID != "" {
		targetProto, targetRevisionNumber, err = revisionByID(ctx, revisionByIDInput{
			projectID:     int64(project.ID),
			appRevisionID: request.AppRevisionID,
			ccpClient:     c.Config().ClusterControlPlaneClient,
		})
		if err != nil {
			err = telemetry.Error(ctx, span, err, "error getting revision proto")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}
	}

	if targetProto == nil {
		targetProto, targetRevisionNumber, err = lastDeployedRevision(ctx, lastDeployedRevisionInput{
			appName:            appName,
			projectID:          int64(project.ID),
			deploymentTargetID: deploymentTargetID.String(),
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
		TargetRevisionNumber: targetRevisionNumber,
	})
}

type revisionByIDInput struct {
	projectID     int64
	appRevisionID string
	ccpClient     porterv1connect.ClusterControlPlaneServiceClient
}

func revisionByID(ctx context.Context, inp revisionByIDInput) (*porterv1.PorterApp, int, error) {
	ctx, span := telemetry.NewSpan(ctx, "get-revision-proto")
	defer span.End()

	var proto *porterv1.PorterApp
	var revisionNumber int

	if inp.projectID == 0 {
		return proto, revisionNumber, telemetry.Error(ctx, span, nil, "project id is empty")
	}
	if inp.appRevisionID == "" {
		return proto, revisionNumber, telemetry.Error(ctx, span, nil, "app revision id is empty")
	}
	if inp.ccpClient == nil {
		return proto, revisionNumber, telemetry.Error(ctx, span, nil, "cluster control plane client is nil")
	}

	getRevisionReq := connect.NewRequest(&porterv1.GetAppRevisionRequest{
		ProjectId:     inp.projectID,
		AppRevisionId: inp.appRevisionID,
	})
	ccpResp, err := inp.ccpClient.GetAppRevision(ctx, getRevisionReq)
	if err != nil {
		return proto, revisionNumber, telemetry.Error(ctx, span, err, "error getting app revision")
	}

	if ccpResp == nil || ccpResp.Msg == nil {
		return proto, revisionNumber, telemetry.Error(ctx, span, nil, "get app revision response is nil")
	}

	proto = ccpResp.Msg.AppRevision.App
	revisionNumber = int(ccpResp.Msg.AppRevision.RevisionNumber)
	if proto == nil || revisionNumber == 0 {
		return proto, revisionNumber, telemetry.Error(ctx, span, nil, "app revision proto is nil")
	}

	return proto, revisionNumber, nil
}

type lastDeployedRevisionInput struct {
	appName            string
	projectID          int64
	deploymentTargetID string
	ccpClient          porterv1connect.ClusterControlPlaneServiceClient
}

func lastDeployedRevision(ctx context.Context, inp lastDeployedRevisionInput) (*porterv1.PorterApp, int, error) {
	ctx, span := telemetry.NewSpan(ctx, "rollback-to-last-deployed-revision")
	defer span.End()

	var proto *porterv1.PorterApp
	var revisionNumber int

	if inp.appName == "" {
		return proto, revisionNumber, telemetry.Error(ctx, span, nil, "app name is empty")
	}
	if inp.projectID == 0 {
		return proto, revisionNumber, telemetry.Error(ctx, span, nil, "project id is empty")
	}
	if inp.deploymentTargetID == "" {
		return proto, revisionNumber, telemetry.Error(ctx, span, nil, "deployment target id is empty")
	}
	if inp.ccpClient == nil {
		return proto, revisionNumber, telemetry.Error(ctx, span, nil, "cluster control plane client is nil")
	}

	listAppRevisionsReq := connect.NewRequest(&porterv1.LatestAppRevisionsRequest{
		ProjectId:          inp.projectID,
		DeploymentTargetId: inp.deploymentTargetID,
	})

	latestAppRevisionsResp, err := inp.ccpClient.LatestAppRevisions(ctx, listAppRevisionsReq)
	if err != nil {
		return proto, revisionNumber, telemetry.Error(ctx, span, err, "error getting latest app revisions")
	}

	if latestAppRevisionsResp == nil || latestAppRevisionsResp.Msg == nil {
		return proto, revisionNumber, telemetry.Error(ctx, span, nil, "latest app revisions response is nil")
	}

	revisions := latestAppRevisionsResp.Msg.AppRevisions
	if len(revisions) == 0 {
		return proto, revisionNumber, telemetry.Error(ctx, span, nil, "no revisions found for app")
	}

	// a failed revision is added to the head of the list of revisions if it is the most recent revision
	// if the most recent revision is successful, then the failed revision will be ignored in the loop below
	// if the most recent revision is successful (revision number != 0), then skip it and start looking for the previous successful revision
	skip := 0
	if revisions[0].RevisionNumber != 0 {
		skip = 1
	}
	if len(revisions) <= skip {
		return proto, revisionNumber, telemetry.Error(ctx, span, nil, "no previous successful revisions found for app")
	}

	for _, rev := range revisions[skip:] {
		if rev.RevisionNumber != 0 {
			proto = rev.App
			revisionNumber = int(rev.RevisionNumber)
			break
		}
	}
	if proto == nil || revisionNumber == 0 {
		return proto, revisionNumber, telemetry.Error(ctx, span, nil, "no previous successful revisions found for app")
	}

	return proto, revisionNumber, nil
}
