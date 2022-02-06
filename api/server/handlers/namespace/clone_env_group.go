package namespace

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/kubernetes/envgroup"
	"github.com/porter-dev/porter/internal/models"
)

type CloneEnvGroupHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewCloneEnvGroupHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *CloneEnvGroupHandler {
	return &CloneEnvGroupHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *CloneEnvGroupHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	request := &types.CloneEnvGroupRequest{}

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

	envGroup, err := envgroup.GetEnvGroup(agent, request.Name, request.Namespace, request.Version)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	if request.CloneName == "" {
		request.CloneName = request.Name
	}

	configMap, err := envgroup.CreateEnvGroup(agent, types.ConfigMapInput{
		Name:      request.CloneName,
		Namespace: namespace,
		Variables: envGroup.Variables,
	})

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	envGroup, err = envgroup.ToEnvGroup(configMap)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	c.WriteResult(w, r, envGroup)
}
