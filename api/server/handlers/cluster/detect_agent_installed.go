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
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	agent, err := c.GetAgent(r, cluster, "")

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	depl, err := agent.GetPorterAgent()

	if targetErr := kubernetes.IsNotFoundError; err != nil && errors.Is(err, targetErr) {
		http.NotFound(w, r)
		return
	} else if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// detect the version of the agent which is installed
	res := &types.DetectAgentResponse{
		Version:       getAgentVersionFromDeployment(depl),
		ShouldUpgrade: false,
	}

	if res.Version != "v3" {
		res.ShouldUpgrade = true
	}

	res.Version = "v" + strings.TrimPrefix(res.Version, "v")

	c.WriteResult(w, r, res)
}

func getAgentVersionFromDeployment(depl *v1.Deployment) string {
	versionAnn := depl.ObjectMeta.Annotations["porter.run/agent-major-version"]

	if versionAnn != "" {
		return versionAnn
	}

	return "v1"
}
