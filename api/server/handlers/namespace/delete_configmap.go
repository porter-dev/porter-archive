package namespace

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/models"
)

type DeleteConfigMapHandler struct {
	handlers.PorterHandlerReader
	authz.KubernetesAgentGetter
}

func NewDeleteConfigMapHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
) *DeleteConfigMapHandler {
	return &DeleteConfigMapHandler{
		PorterHandlerReader:   handlers.NewDefaultPorterHandler(config, decoderValidator, nil),
		KubernetesAgentGetter: authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *DeleteConfigMapHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	request := &types.DeleteConfigMapRequest{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	namespace := r.Context().Value(types.NamespaceScope).(string)
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	agent, err := c.GetAgent(r, cluster)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	if err := deleteConfigMap(agent, request.Name, namespace); err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	w.WriteHeader(http.StatusOK)
}

func deleteConfigMap(agent *kubernetes.Agent, name, namespace string) error {
	if err := agent.DeleteLinkedSecret(name, namespace); err != nil {
		return err
	}

	if err := agent.DeleteConfigMap(name, namespace); err != nil {
		return err
	}

	return nil
}
