package porter_app

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/shared/requestutils"

	"connectrpc.com/connect"

	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"

	"github.com/google/uuid"

	"github.com/porter-dev/porter/internal/porter_app"
	"github.com/porter-dev/porter/internal/telemetry"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

// LatestAppRevisionHandler handles requests to the /apps/{porter_app_name}/latest endpoint
type LatestAppRevisionHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

// NewLatestAppRevisionHandler returns a new LatestAppRevisionHandler
func NewLatestAppRevisionHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *LatestAppRevisionHandler {
	return &LatestAppRevisionHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

// LatestAppRevisionRequest is the request object for the /apps/{porter_app_name}/latest endpoint
type LatestAppRevisionRequest struct {
	DeploymentTargetID string `schema:"deployment_target_id"`
}

// LatestAppRevisionResponse is the response object for the /apps/{porter_app_name}/latest endpoint
type LatestAppRevisionResponse struct {
	// AppRevision is the latest revision for the app
	AppRevision porter_app.Revision `json:"app_revision"`
}

// ServeHTTP translates the request into a CurrentAppRevision grpc request, forwards to the cluster control plane, and returns the response.
// Multi-cluster projects are not supported, as they may have multiple porter-apps with the same name in the same project.
func (c *LatestAppRevisionHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-latest-app-revision")
	defer span.End()

	project, _ := ctx.Value(types.ProjectScope).(*models.Project)
	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "project-id", Value: project.ID},
		telemetry.AttributeKV{Key: "cluster-id", Value: cluster.ID},
	)

	appName, reqErr := requestutils.GetURLParamString(r, types.URLParamPorterAppName)
	if reqErr != nil {
		e := telemetry.Error(ctx, span, reqErr, "error parsing stack name from url")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusBadRequest))
		return
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "app-name", Value: appName})

	request := &LatestAppRevisionRequest{}
	if ok := c.DecodeAndValidate(w, r, request); !ok {
		err := telemetry.Error(ctx, span, nil, "error decoding request")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	_, err := uuid.Parse(request.DeploymentTargetID)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error parsing deployment target id")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "deployment-target-id", Value: request.DeploymentTargetID})

	porterApps, err := c.Repo().PorterApp().ReadPorterAppsByProjectIDAndName(project.ID, appName)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error getting porter app from repo")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	if len(porterApps) == 0 {
		err := telemetry.Error(ctx, span, err, "no porter apps returned")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	if len(porterApps) > 1 {
		err := telemetry.Error(ctx, span, err, "multiple porter apps returned; unable to determine which one to use")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	if porterApps[0].ID == 0 {
		err := telemetry.Error(ctx, span, err, "porter app id is missing")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	agent, err := c.GetAgent(r, cluster, "")
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error getting agent")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	currentAppRevisionReq := connect.NewRequest(&porterv1.CurrentAppRevisionRequest{
		ProjectId:          int64(project.ID),
		AppId:              int64(porterApps[0].ID),
		DeploymentTargetId: request.DeploymentTargetID,
	})

	currentAppRevisionResp, err := c.Config().ClusterControlPlaneClient.CurrentAppRevision(ctx, currentAppRevisionReq)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error getting current app revision from cluster control plane client")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	if currentAppRevisionResp == nil || currentAppRevisionResp.Msg == nil {
		err := telemetry.Error(ctx, span, err, "current app revision resp is nil")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	appRevision := currentAppRevisionResp.Msg.AppRevision
	encodedRevision, err := porter_app.EncodedRevisionFromProto(ctx, appRevision)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error encoding revision from proto")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	revisionWithEnv, err := porter_app.AttachEnvToRevision(ctx, porter_app.AttachEnvToRevisionInput{
		ProjectID:           project.ID,
		ClusterID:           int(cluster.ID),
		DeploymentTargetID:  request.DeploymentTargetID,
		Revision:            encodedRevision,
		K8SAgent:            agent,
		PorterAppRepository: c.Repo().PorterApp(),
		DeploymentTargetRepository: c.Repo().DeploymentTarget(),
	})
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error attaching env to revision")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	response := LatestAppRevisionResponse{
		AppRevision: revisionWithEnv,
	}

	c.WriteResult(w, r, response)
}
