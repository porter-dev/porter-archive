package cluster

import (
	"net/http"

	"github.com/porter-dev/porter/internal/kubernetes/prometheus"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type GetPodMetricsHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewGetPodMetricsHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *GetPodMetricsHandler {
	return &GetPodMetricsHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *GetPodMetricsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	request := &types.GetPodMetricsRequest{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	agent, err := c.GetAgent(r, cluster)

	if err != nil {
		c.HandleAPIError(r.Context(), w, apierrors.NewErrInternal(err))
		return
	}

	// get prometheus service
	promSvc, found, err := prometheus.GetPrometheusService(agent.Clientset)

	if err != nil || !found {
		c.HandleAPIError(r.Context(), w, apierrors.NewErrInternal(err))
		return
	}

	rawQuery, err := prometheus.QueryPrometheus(agent.Clientset, promSvc, &request.QueryOpts)

	if err != nil {
		c.HandleAPIError(r.Context(), w, apierrors.NewErrInternal(err))
		return
	}

	s := string(rawQuery)

	var res types.GetPodMetricsResponse = &s

	c.WriteResult(r.Context(), w, res)
}
