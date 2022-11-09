package cluster

import (
	"fmt"
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

type CreateNamespaceHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewCreateNamespaceHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *CreateNamespaceHandler {
	return &CreateNamespaceHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *CreateNamespaceHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	request := &types.CreateNamespaceRequest{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	agent, err := c.GetAgent(r, cluster, "")

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	_, err = agent.GetNamespace(request.Name)

	if err == nil { // namespace with name already exists
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
			fmt.Errorf("namespace already exists"), http.StatusPreconditionFailed,
		))
		return
	}

	namespace, err := agent.CreateNamespace(request.Name, request.Annotations)

	if err != nil {
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

	w.WriteHeader(http.StatusCreated)
	c.WriteResult(w, r, res)
}
