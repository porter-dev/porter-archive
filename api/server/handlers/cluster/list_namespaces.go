package cluster

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type ClusterListNamespacesHandler struct {
	handlers.PorterHandlerWriter
	KubernetesAgentGetter
}

func NewClusterListNamespacesHandler(
	config *shared.Config,
	writer shared.ResultWriter,
) *ClusterListNamespacesHandler {
	return &ClusterListNamespacesHandler{
		PorterHandlerWriter:   handlers.NewDefaultPorterHandler(config, nil, writer),
		KubernetesAgentGetter: NewDefaultKubernetesAgentGetter(config),
	}
}

func (c *ClusterListNamespacesHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	agent, err := c.GetAgent(cluster)

	if err != nil {
		c.HandleAPIError(w, apierrors.NewErrInternal(err))
		return
	}

	namespaceList, err := agent.ListNamespaces()

	if err != nil {
		c.HandleAPIError(w, apierrors.NewErrInternal(err))
		return
	}

	res := types.ClusterListNamespacesResponse{
		NamespaceList: namespaceList,
	}

	c.WriteResult(w, res)
}
