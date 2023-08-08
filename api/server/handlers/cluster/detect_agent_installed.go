package cluster

import (
	"errors"
	"net/http"
	"strings"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
	v1 "k8s.io/api/apps/v1"
)

type DetectAgentInstalledHandler struct {
	handlers.PorterHandlerWriter
	authz.KubernetesAgentGetter
}

func NewDetectAgentInstalledHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *DetectAgentInstalledHandler {
	return &DetectAgentInstalledHandler{
		PorterHandlerWriter:   handlers.NewDefaultPorterHandler(config, nil, writer),
		KubernetesAgentGetter: authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *DetectAgentInstalledHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	ctx, span := telemetry.NewSpan(ctx, "detect-agent-installed")
	defer span.End()

	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)
	agent, err := c.GetAgent(r, cluster, "")
	if err != nil {
		err = telemetry.Error(ctx, span, err, "failed to get k8s agent")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	res, err := GetAgentVersionResponse(agent)
	if err != nil && errors.Is(err, kubernetes.IsNotFoundError) {
		err = telemetry.Error(ctx, span, err, "porter agent not found")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusNotFound))
		return
	} else if err != nil {
		err = telemetry.Error(ctx, span, err, "porter agent not found")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	if res.Version != "v3" {
		res.ShouldUpgrade = true
	}

	res.Version = "v" + strings.TrimPrefix(res.Version, "v")

	c.WriteResult(w, r, res)
}

func GetAgentVersionResponse(agent *kubernetes.Agent) (*types.DetectAgentResponse, error) {
	depl, err := agent.GetPorterAgent()
	if err != nil {
		return nil, err
	}

	return &types.DetectAgentResponse{
		Version:       getAgentVersionFromDeployment(depl),
		ShouldUpgrade: false,
		Image:         getImageFromDeployment(depl),
	}, nil
}

func getAgentVersionFromDeployment(depl *v1.Deployment) string {
	versionAnn := depl.ObjectMeta.Annotations["porter.run/agent-major-version"]

	if versionAnn != "" {
		return versionAnn
	}

	return "v1"
}

func getImageFromDeployment(depl *v1.Deployment) string {
	if len(depl.Spec.Template.Spec.Containers) > 0 {
		return depl.Spec.Template.Spec.Containers[0].Image
	}
	return ""
}
