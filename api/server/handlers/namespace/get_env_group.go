package namespace

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/models"
	v1 "k8s.io/api/core/v1"
)

type GetEnvGroupHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewGetEnvGroupHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *GetEnvGroupHandler {
	return &GetEnvGroupHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *GetEnvGroupHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	request := &types.GetEnvGroupRequest{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	namespace := r.Context().Value(types.NamespaceScope).(string)
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	agent, err := c.GetAgent(r, cluster, "")

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	var configMap *v1.ConfigMap

	if request.Version == 0 {
		configMap, _, err = agent.GetLatestVersionedConfigMap(request.Name, namespace)
	} else {
		configMap, err = agent.GetVersionedConfigMap(request.Name, namespace, request.Version)
	}

	if err != nil && errors.Is(err, kubernetes.IsNotFoundError) {
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
			fmt.Errorf("env group not found"),
			http.StatusNotFound,
		))
		return
	} else if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	envGroup, err := toEnvGroup(configMap)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	c.WriteResult(w, r, envGroup)
}
