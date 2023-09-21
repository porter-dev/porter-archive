package porter_app

import (
	"fmt"
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
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
	v1 "k8s.io/api/core/v1"
)

// PodStatusHandler is the handler for GET /apps/pods
type PodStatusHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

// NewPodStatusHandler returns a new PodStatusHandler
func NewPodStatusHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *PodStatusHandler {
	return &PodStatusHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

// PodStatusRequest is the expected format for a request body on GET /apps/pods
type PodStatusRequest struct {
	DeploymentTargetID string `schema:"deployment_target_id"`
	ServiceName        string `schema:"service"`
}

func (c *PodStatusHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-pod-status")
	defer span.End()

	request := &PodStatusRequest{}
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

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "service-name", Value: request.ServiceName}, telemetry.AttributeKV{Key: "app-name", Value: appName})

	if request.DeploymentTargetID == "" {
		err := telemetry.Error(ctx, span, nil, "must provide deployment target id")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "deployment-target-id", Value: request.DeploymentTargetID})

	deploymentTargetDetailsReq := connect.NewRequest(&porterv1.DeploymentTargetDetailsRequest{
		ProjectId:          int64(project.ID),
		DeploymentTargetId: request.DeploymentTargetID,
	})

	deploymentTargetDetailsResp, err := c.Config().ClusterControlPlaneClient.DeploymentTargetDetails(ctx, deploymentTargetDetailsReq)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error getting deployment target details from cluster control plane client")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	if deploymentTargetDetailsResp == nil || deploymentTargetDetailsResp.Msg == nil {
		err := telemetry.Error(ctx, span, err, "deployment target details resp is nil")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	if deploymentTargetDetailsResp.Msg.ClusterId != int64(cluster.ID) {
		err := telemetry.Error(ctx, span, err, "deployment target details resp cluster id does not match cluster id")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	namespace := deploymentTargetDetailsResp.Msg.Namespace
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "namespace", Value: namespace})

	agent, err := c.GetAgent(r, cluster, "")
	if err != nil {
		err = telemetry.Error(ctx, span, err, "unable to get agent")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	pods := []v1.Pod{}

	selectors := fmt.Sprintf("porter.run/service-name=%s,porter.run/deployment-target-id=%s,porter.run/app-name=%s", request.ServiceName, request.DeploymentTargetID, appName)
	podsList, err := agent.GetPodsByLabel(selectors, namespace)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "unable to get pods by label")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	pods = append(pods, podsList.Items...)

	c.WriteResult(w, r, pods)
}
