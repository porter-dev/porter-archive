package kube_events

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type ListKubeEventsHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewListKubeEventsHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *ListKubeEventsHandler {
	return &ListKubeEventsHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *ListKubeEventsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	request := &types.ListKubeEventRequest{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	kubeEvents, count, err := c.Repo().KubeEvent().ListEventsByProjectID(proj.ID, cluster.ID, request)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	resp := &types.ListKubeEventsResponse{
		Count:      count,
		Limit:      request.Limit,
		Skip:       request.Skip,
		KubeEvents: []*types.KubeEvent{},
	}

	for _, kubeEvent := range kubeEvents {
		resp.KubeEvents = append(resp.KubeEvents, kubeEvent.ToKubeEventType())
	}

	c.WriteResult(w, r, resp)
}
