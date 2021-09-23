package cluster

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/kubernetes/domain"
	"github.com/porter-dev/porter/internal/models"
)

type ClusterGetHandler struct {
	handlers.PorterHandlerWriter
	authz.KubernetesAgentGetter
}

func NewClusterGetHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *ClusterGetHandler {
	return &ClusterGetHandler{
		PorterHandlerWriter:   handlers.NewDefaultPorterHandler(config, nil, writer),
		KubernetesAgentGetter: authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *ClusterGetHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	res := &types.ClusterGetResponse{
		Cluster: cluster.ToClusterType(),
	}

	agent, err := c.GetAgent(r, cluster, "")

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	endpoint, found, ingressErr := domain.GetNGINXIngressServiceIP(agent.Clientset)

	if found {
		res.IngressIP = endpoint
	}

	if !found && ingressErr != nil {
		res.IngressError = kubernetes.CatchK8sConnectionError(ingressErr).Externalize()
	}

	c.WriteResult(w, r, res)
}
