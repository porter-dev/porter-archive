package cluster

import (
	"net/http"
	"time"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type ListNamespacesHandler struct {
	handlers.PorterHandlerWriter
	authz.KubernetesAgentGetter
}

func NewListNamespacesHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *ListNamespacesHandler {
	return &ListNamespacesHandler{
		PorterHandlerWriter:   handlers.NewDefaultPorterHandler(config, nil, writer),
		KubernetesAgentGetter: authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *ListNamespacesHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	agent, err := c.GetAgent(r, cluster, "")

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	namespaceList, err := agent.ListNamespaces()

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	res := types.ListNamespacesResponse{}

	for _, ns := range namespaceList.Items {
		namespace := &types.NamespaceResponse{
			Name:              ns.Name,
			CreationTimestamp: ns.CreationTimestamp.Time.UTC().Format(time.RFC1123),
			Status:            string(ns.Status.Phase),
		}

		if ns.DeletionTimestamp != nil {
			namespace.DeletionTimestamp = ns.DeletionTimestamp.Time.UTC().Format(time.RFC1123)
		}

		res = append(res, namespace)
	}

	c.WriteResult(w, r, res)
}
