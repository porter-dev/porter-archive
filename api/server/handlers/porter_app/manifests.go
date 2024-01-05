package porter_app

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/shared/requestutils"

	"connectrpc.com/connect"

	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"

	"github.com/porter-dev/porter/internal/telemetry"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

// AppManifestsHandler handles requests to the /apps/{porter_app_name}/manifests endpoint
type AppManifestsHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

// NewAppManifestsHandler returns a new AppManifestsHandler
func NewAppManifestsHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *AppManifestsHandler {
	return &AppManifestsHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

// AppManifestsRequest is the request object for the /apps/{porter_app_name}/manifests endpoint
type AppManifestsRequest struct {
	DeploymentTargetID string `schema:"deployment_target_id"`
}

// AppManifestsResponse is the response object for the /apps/{porter_app_name}/manifests endpoint
type AppManifestsResponse struct {
	// Base64Manifests is the base64 encoded manifests
	Base64Manifests string `json:"base64_manifests"`
}

// ServeHTTP translates the request into a TemplateAppManifests grpc request, forwards to the cluster control plane, and returns the response.
func (c *AppManifestsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-app-manifests")
	defer span.End()

	project, _ := ctx.Value(types.ProjectScope).(*models.Project)
	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)

	appName, reqErr := requestutils.GetURLParamString(r, types.URLParamPorterAppName)
	if reqErr != nil {
		e := telemetry.Error(ctx, span, reqErr, "error parsing stack name from url")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusBadRequest))
		return
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "app-name", Value: appName})

	request := &AppManifestsRequest{}
	if ok := c.DecodeAndValidate(w, r, request); !ok {
		err := telemetry.Error(ctx, span, nil, "error decoding request")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	// optional deployment target id - if not provided, use the cluster's default
	deploymentTargetID := request.DeploymentTargetID
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "deployment-target-id", Value: deploymentTargetID})

	var deploymentTargetIdentifer *porterv1.DeploymentTargetIdentifier
	if deploymentTargetID != "" {
		deploymentTargetIdentifer = &porterv1.DeploymentTargetIdentifier{
			Id: deploymentTargetID,
		}
	}

	appManifestsReq := connect.NewRequest(&porterv1.TemplateAppManifestsRequest{
		ProjectId:                  int64(project.ID),
		ClusterId:                  int64(cluster.ID),
		AppName:                    appName,
		DeploymentTargetIdentifier: deploymentTargetIdentifer,
	})

	appManifestsRes, err := c.Config().ClusterControlPlaneClient.TemplateAppManifests(ctx, appManifestsReq)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error getting current app manifests from cluster control plane client")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	if appManifestsRes == nil || appManifestsRes.Msg == nil {
		err := telemetry.Error(ctx, span, err, "current app manifests resp is nil")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	response := AppManifestsResponse{
		Base64Manifests: appManifestsRes.Msg.Base64Manifests,
	}

	c.WriteResult(w, r, response)
}
