package env_group

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/kubernetes/envgroup"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/stacks"
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
	namespace := r.Context().Value(types.NamespaceScope).(string)
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	name, reqErr := requestutils.GetURLParamString(r, types.URLParamEnvGroupName)

	if reqErr != nil {
		c.HandleAPIError(w, r, reqErr)
		return
	}

	agent, err := c.GetAgent(r, cluster, "")

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	configMaps, err := agent.ListVersionedConfigMaps(name, namespace)

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

	var res types.V1EnvGroupsAllVersionsResponse

	for _, cm := range configMaps {
		eg, err := envgroup.ToEnvGroup(&cm)

		if err != nil {
			continue
		}

		elem := &types.V1EnvGroupResponse{
			CreatedAt: eg.CreatedAt,
			Version:   eg.Version,
			Name:      eg.Name,
			Releases:  eg.Applications,
			Variables: eg.Variables,
		}

		stackId, err := stacks.GetStackForEnvGroup(c.Config(), cluster.ProjectID, cluster.ID, eg)

		if err == nil && len(stackId) > 0 {
			elem.StackID = stackId
		}

		res = append(res, elem)
	}

	c.WriteResult(w, r, res)
}
