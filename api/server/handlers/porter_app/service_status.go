package porter_app

import (
	"net/http"

	"connectrpc.com/connect"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/deployment_target"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/porter_app"
	"github.com/porter-dev/porter/internal/telemetry"
)

// ServiceStatusHandler is the handler for GET /apps/pods
type ServiceStatusHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

// NewServiceStatusHandler returns a new ServiceStatusHandler
func NewServiceStatusHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *ServiceStatusHandler {
	return &ServiceStatusHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

// ServiceStatusRequest is the expected format for a request body on GET /apps/pods
type ServiceStatusRequest struct {
	DeploymentTargetID string `schema:"deployment_target_id"`
	ServiceName        string `schema:"service"`
}

// ServiceStatusResponse is the expected format for a response body on GET /apps/pods
type ServiceStatusResponse struct {
	Status porter_app.ServiceStatus `json:"status"`
}

func (c *ServiceStatusHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-pod-status")
	defer span.End()

	request := &ServiceStatusRequest{}
	if ok := c.DecodeAndValidate(w, r, request); !ok {
		err := telemetry.Error(ctx, span, nil, "invalid request")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	appName, reqErr := requestutils.GetURLParamString(r, types.URLParamPorterAppName)
	if reqErr != nil {
		err := telemetry.Error(ctx, span, reqErr, "porter app name not found in request")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)
	project, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "service-name", Value: request.ServiceName},
		telemetry.AttributeKV{Key: "app-name", Value: appName},
		telemetry.AttributeKV{Key: "deployment-target-id", Value: request.DeploymentTargetID},
	)

	deploymentTarget, err := deployment_target.DeploymentTargetDetails(ctx, deployment_target.DeploymentTargetDetailsInput{
		ProjectID:          int64(project.ID),
		ClusterID:          int64(cluster.ID),
		DeploymentTargetID: request.DeploymentTargetID,
		CCPClient:          c.Config().ClusterControlPlaneClient,
	})
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error getting deployment target details")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	namespace := deploymentTarget.Namespace
	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "namespace", Value: namespace},
		telemetry.AttributeKV{Key: "deployment-target-id", Value: deploymentTarget.ID},
	)

	app, err := c.Repo().PorterApp().ReadPorterAppByName(cluster.ID, appName)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error reading porter app by name")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}
	if app == nil || app.ID == 0 {
		err = telemetry.Error(ctx, span, nil, "app with name does not exist in project")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "app-id", Value: app.ID})

	agent, err := c.GetAgent(r, cluster, "")
	if err != nil {
		err = telemetry.Error(ctx, span, err, "unable to get agent")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}
	if agent == nil {
		err = telemetry.Error(ctx, span, nil, "agent is nil")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	listAppRevisionsReq := connect.NewRequest(&porterv1.ListAppRevisionsRequest{
		ProjectId:          int64(project.ID),
		AppId:              int64(app.ID),
		DeploymentTargetId: request.DeploymentTargetID,
	})

	listAppRevisionsResp, err := c.Config().ClusterControlPlaneClient.ListAppRevisions(ctx, listAppRevisionsReq)
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

	var revisions []porter_app.Revision
	for _, revision := range appRevisions {
		encodedRevision, err := porter_app.EncodedRevisionFromProto(ctx, revision)
		if err != nil {
			err := telemetry.Error(ctx, span, err, "error getting encoded revision from proto")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}

		revisions = append(revisions, encodedRevision)
	}

	serviceStatus, err := porter_app.GetServiceStatus(ctx, porter_app.GetServiceStatusInput{
		DeploymentTarget: deploymentTarget,
		Agent:            *agent,
		AppName:          appName,
		ServiceName:      request.ServiceName,
		AppRevisions:     revisions,
	})
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error getting service status")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	res := ServiceStatusResponse{
		Status: serviceStatus,
	}

	c.WriteResult(w, r, res)
}
