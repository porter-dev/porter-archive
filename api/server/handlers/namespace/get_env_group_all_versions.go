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
)

type GetEnvGroupAllVersionsHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewGetEnvGroupAllVersionsHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *GetEnvGroupAllVersionsHandler {
	return &GetEnvGroupAllVersionsHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *GetEnvGroupAllVersionsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	request := &types.GetEnvGroupAllRequest{}

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

	configMaps, err := agent.ListVersionedConfigMaps(request.Name, namespace)

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

	res := make(types.ListEnvGroupsResponse, 0)

	for _, cm := range configMaps {
		eg, err := toEnvGroup(&cm)

		if err != nil {
			continue
		}

		res = append(res, &types.EnvGroupMeta{
			Name:      eg.Name,
			Namespace: eg.Namespace,
			Version:   eg.Version,
		})
	}

	c.WriteResult(w, r, res)
}
