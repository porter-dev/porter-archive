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
	"github.com/porter-dev/porter/internal/porter_app"
	"github.com/porter-dev/porter/internal/telemetry"
)

// AppInstancesHandler is the handler for the /apps/instances endpoint
type AppInstancesHandler struct {
	handlers.PorterHandlerReadWriter
}

// NewAppInstancesHandler handles GET requests to the /apps/instances endpoint
func NewAppInstancesHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *AppInstancesHandler {
	return &AppInstancesHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

// AppInstancesRequest is the request object for the /apps/instances endpoint
type AppInstancesRequest struct {
	DeploymentTargetID string `schema:"deployment_target_id"`
}

// AppInstancesResponse is the response object for the /apps/instances endpoint
type AppInstancesResponse struct {
	AppInstances []porter_app.AppInstance `json:"app_instances"`
}

// ServeHTTP translates the request into a ListAppInstancesRequest to the cluster control plane
func (c *AppInstancesHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-list-app-instances")
	defer span.End()

	project, _ := r.Context().Value(types.ProjectScope).(*models.Project)
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	request := &AppInstancesRequest{}
	if ok := c.DecodeAndValidate(w, r, request); !ok {
		err := telemetry.Error(ctx, span, nil, "error decoding request")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "project-id", Value: project.ID},
		telemetry.AttributeKV{Key: "cluster-id", Value: cluster.ID},
		telemetry.AttributeKV{Key: "deployment-target-id", Value: request.DeploymentTargetID},
	)

	var deploymentTargetIdentifier *porterv1.DeploymentTargetIdentifier
	if request.DeploymentTargetID != "" {
		deploymentTargetIdentifier = &porterv1.DeploymentTargetIdentifier{
			Id: request.DeploymentTargetID,
		}
	}

	listAppInstancesReq := connect.NewRequest(&porterv1.ListAppInstancesRequest{
		ProjectId:                  int64(project.ID),
		DeploymentTargetIdentifier: deploymentTargetIdentifier,
	})

	latestAppInstancesResp, err := c.Config().ClusterControlPlaneClient.ListAppInstances(ctx, listAppInstancesReq)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error getting latest app revisions")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	if latestAppInstancesResp == nil || latestAppInstancesResp.Msg == nil {
		err = telemetry.Error(ctx, span, nil, "latest app revisions response is nil")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	protoAppInstances := latestAppInstancesResp.Msg.AppInstances
	if protoAppInstances == nil {
		protoAppInstances = []*porterv1.AppInstance{}
	}

	var appInstances []porter_app.AppInstance

	for _, instance := range protoAppInstances {
		appInstances = append(appInstances, porter_app.AppInstance{
			Id: instance.Id,
			DeploymentTarget: porter_app.DeploymentTarget{
				ID:   instance.DeploymentTargetId,
				Name: "",
			},
			Name: instance.Name,
		})
	}

	c.WriteResult(w, r, AppInstancesResponse{AppInstances: appInstances})
}
