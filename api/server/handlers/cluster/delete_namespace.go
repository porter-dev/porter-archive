package cluster

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type DeleteNamespaceHandler struct {
	handlers.PorterHandlerReader
	authz.KubernetesAgentGetter
}

func NewDeleteNamespaceHandler(
	config *shared.Config,
	decoderValidator shared.RequestDecoderValidator,
) *DeleteNamespaceHandler {
	return &DeleteNamespaceHandler{
		PorterHandlerReader:   handlers.NewDefaultPorterHandler(config, decoderValidator, nil),
		KubernetesAgentGetter: authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *DeleteNamespaceHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	request := &types.DeleteNamespaceRequest{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	agent, err := c.GetAgent(r, cluster)

	if err != nil {
		c.HandleAPIError(w, apierrors.NewErrInternal(err))
		return
	}

	if err := agent.DeleteNamespace(request.Name); err != nil {
		c.HandleAPIError(w, apierrors.NewErrInternal(err))
		return
	}

	w.WriteHeader(http.StatusOK)
}
