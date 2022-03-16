package cluster

import (
	"errors"
	"net/http"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/models"
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
	res := &types.GetAgentResponse{}

	versionAnn, ok := depl.ObjectMeta.Annotations["porter.run/agent-major-version"]

	if !ok {
		res.Version = "v1"
	} else {
		res.Version = versionAnn
	}

	c.WriteResult(w, r, res)
}
