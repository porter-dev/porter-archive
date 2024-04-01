package porter_app

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/shared/requestutils"

	"connectrpc.com/connect"

	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"

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
	DeploymentTargetID   string `schema:"deployment_target_id,omitempty"`
	DeploymentTargetName string `schema:"deployment_target_name,omitempty"`
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

	deploymentTargetName := request.DeploymentTargetName
	if request.DeploymentTargetName == "" && request.DeploymentTargetID == "" {
		defaultDeploymentTarget, err := defaultDeploymentTarget(ctx, defaultDeploymentTargetInput{
			ProjectID:                 project.ID,
			ClusterID:                 cluster.ID,
			ClusterControlPlaneClient: c.Config().ClusterControlPlaneClient,
		})
		if err != nil {
			err := telemetry.Error(ctx, span, err, "error getting default deployment target")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}
		deploymentTargetName = defaultDeploymentTarget.Name
	}
	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "deployment-target-name", Value: deploymentTargetName},
		telemetry.AttributeKV{Key: "deployment-target-id", Value: request.DeploymentTargetID},
	)

	currentAppRevisionReq := connect.NewRequest(&porterv1.CurrentAppRevisionRequest{
		ProjectId: int64(project.ID),
		DeploymentTargetIdentifier: &porterv1.DeploymentTargetIdentifier{
			Id:   request.DeploymentTargetID,
			Name: deploymentTargetName,
		},
		AppName: appName,
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

	appRevisionId := encodedRevision.ID
	appInstanceId := encodedRevision.AppInstanceID
	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "app-revision-id", Value: appRevisionId},
		telemetry.AttributeKV{Key: "app-instance-id", Value: appInstanceId},
	)

	response := LatestAppRevisionResponse{
		AppRevision: encodedRevision,
	}

	c.WriteResult(w, r, response)
}
