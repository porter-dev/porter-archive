package cluster

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/kubernetes/prometheus"
	"github.com/porter-dev/porter/internal/models"
)

type ListNGINXIngressesHandler struct {
	handlers.PorterHandlerWriter
	KubernetesAgentGetter
}

func NewListNGINXIngressesHandler(
	config *shared.Config,
	writer shared.ResultWriter,
) *ListNGINXIngressesHandler {
	return &ListNGINXIngressesHandler{
		PorterHandlerWriter:   handlers.NewDefaultPorterHandler(config, nil, writer),
		KubernetesAgentGetter: NewDefaultKubernetesAgentGetter(config),
	}
}

func (c *ListNGINXIngressesHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	agent, err := c.GetAgent(cluster)

	if err != nil {
		c.HandleAPIError(w, apierrors.NewErrInternal(err))
		return
	}

	ingresses, err := prometheus.GetIngressesWithNGINXAnnotation(agent.Clientset)

	if err != nil {
		c.HandleAPIError(w, apierrors.NewErrInternal(err))
		return
	}

	var res types.ListNGINXIngressesResponse = ingresses

	c.WriteResult(w, res)
}
