package cluster

import (
	"net/http"
	"time"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"k8s.io/apimachinery/pkg/api/errors"
)

type GetNamespaceHandler struct {
	handlers.PorterHandlerWriter
	authz.KubernetesAgentGetter
}

func NewGetNamespaceHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *GetNamespaceHandler {
	return &GetNamespaceHandler{
		PorterHandlerWriter:   handlers.NewDefaultPorterHandler(config, nil, writer),
		KubernetesAgentGetter: authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *GetNamespaceHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ns, reqErr := requestutils.GetURLParamString(r, types.URLParamNamespace)

	if reqErr != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(reqErr))
	}

	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	agent, err := c.GetAgent(r, cluster, "")

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	namespace, err := agent.GetNamespace(ns)

	if err != nil {
		if errors.IsNotFound(err) {
			c.HandleAPIError(w, r, apierrors.NewErrNotFound(err))
			return
		}

		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	res := &types.NamespaceResponse{
		Name:              namespace.Name,
		CreationTimestamp: namespace.CreationTimestamp.Time.UTC().Format(time.RFC1123),
		Status:            string(namespace.Status.Phase),
	}

	if namespace.DeletionTimestamp != nil {
		res.DeletionTimestamp = namespace.DeletionTimestamp.Time.UTC().Format(time.RFC1123)
	}

	c.WriteResult(w, r, res)
}
