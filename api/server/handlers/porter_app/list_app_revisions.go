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
	"github.com/porter-dev/porter/internal/porter_app"
	"github.com/porter-dev/porter/internal/telemetry"
)

// ListAppRevisionsHandler handles requests to the /apps/{porter_app_name}/revisions endpoint
type ListAppRevisionsHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

// NewListAppRevisionsHandler returns a new ListAppRevisionsHandler
func NewListAppRevisionsHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *ListAppRevisionsHandler {
	return &ListAppRevisionsHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

// ListAppRevisionsRequest represents the response from the /apps/{porter_app_name}/revisions endpoint
type ListAppRevisionsRequest struct {
	// The deployment target ID for the revisions
	DeploymentTargetID string `schema:"deployment_target_id"`
}

// ListAppRevisionsResponse represents the response from the /apps/{porter_app_name}/revisions endpoint
type ListAppRevisionsResponse struct {
	AppRevisions []porter_app.Revision `json:"app_revisions"`
}

func (c *ListAppRevisionsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-list-app-revisions")
	defer span.End()

	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)
	project, _ := r.Context().Value(types.ProjectScope).(*models.Project)

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

	request := &ListAppRevisionsRequest{}
	if ok := c.DecodeAndValidate(w, r, request); !ok {
		err := telemetry.Error(ctx, span, nil, "error decoding request")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	deploymentTargetID, err := uuid.Parse(request.DeploymentTargetID)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "invalid deployment target ID")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	if deploymentTargetID == uuid.Nil {
		err = telemetry.Error(ctx, span, nil, "deployment target ID cannot be nil")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "deployment-target-id", Value: deploymentTargetID.String()})

	listAppRevisionsReq := connect.NewRequest(&porterv1.ListAppRevisionsRequest{
		ProjectId:          int64(project.ID),
		AppId:              int64(app.ID),
		DeploymentTargetId: request.DeploymentTargetID,
	})

	listAppRevisionsResp, err := c.Config().ClusterControlPlaneClient.ListAppRevisions(r.Context(), listAppRevisionsReq)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error listing app revisions")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	if listAppRevisionsResp == nil || listAppRevisionsResp.Msg == nil {
		err = telemetry.Error(ctx, span, nil, "list app revisions response is nil")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	appRevisions := listAppRevisionsResp.Msg.AppRevisions
	if appRevisions == nil {
		appRevisions = []*porterv1.AppRevision{}
	}

	agent, err := c.GetAgent(r, cluster, "")
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error getting agent")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	res := &ListAppRevisionsResponse{
		AppRevisions: make([]porter_app.Revision, 0),
	}

	for _, revision := range appRevisions {
		encodedRevision, err := porter_app.EncodedRevisionFromProto(ctx, revision)
		if err != nil {
			err := telemetry.Error(ctx, span, err, "error getting encoded revision from proto")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}

		revisionWithEnv, err := porter_app.AttachEnvToRevision(ctx, porter_app.AttachEnvToRevisionInput{
			Revision:                   encodedRevision,
			ProjectID:                  project.ID,
			ClusterID:                  int(cluster.ID),
			DeploymentTargetID:         request.DeploymentTargetID,
			K8SAgent:                   agent,
			PorterAppRepository:        c.Repo().PorterApp(),
			DeploymentTargetRepository: c.Repo().DeploymentTarget(),
		})
		if err != nil {
			err := telemetry.Error(ctx, span, err, "error attaching env to revision")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}

		res.AppRevisions = append(res.AppRevisions, revisionWithEnv)
	}

	c.WriteResult(w, r, res)
}
