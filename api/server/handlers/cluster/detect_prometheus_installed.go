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

type DetectPrometheusInstalledHandler struct {
	handlers.PorterHandler
	KubernetesAgentGetter
}

func NewDetectPrometheusInstalledHandler(
	config *shared.Config,
) *DetectPrometheusInstalledHandler {
	return &DetectPrometheusInstalledHandler{
		PorterHandler:         handlers.NewDefaultPorterHandler(config, nil, nil),
		KubernetesAgentGetter: NewDefaultKubernetesAgentGetter(config),
	}
}

func (c *DetectPrometheusInstalledHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	agent, err := c.GetAgent(cluster)

	if err != nil {
		c.HandleAPIError(w, apierrors.NewErrInternal(err))
		return
	}

	if _, found, err := prometheus.GetPrometheusService(agent.Clientset); err != nil {
		c.HandleAPIError(w, apierrors.NewErrInternal(err))
		return
	} else if !found {
		http.NotFound(w, r)
		return
	}

	w.WriteHeader(http.StatusOK)
}
