package env_group

import (
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/kubernetes/envgroup"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/stacks"
	"gorm.io/gorm"
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
	namespace := r.Context().Value(types.NamespaceScope).(string)
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	name, reqErr := requestutils.GetURLParamString(r, types.URLParamEnvGroupName)

	if reqErr != nil {
		c.HandleAPIError(w, r, reqErr)
		return
	}

	version, reqErr := requestutils.GetURLParamUint(r, types.URLParamEnvGroupVersion)

	if reqErr != nil {
		c.HandleAPIError(w, r, reqErr)
		return
	}

	agent, err := c.GetAgent(r, cluster, "")

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	envGroup, err := envgroup.GetEnvGroup(agent, name, namespace, version)

	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
				fmt.Errorf("env group not found"),
				http.StatusNotFound),
			)
			return
		}
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	stackId, err := stacks.GetStackForEnvGroup(c.Config(), cluster.ProjectID, cluster.ID, envGroup)

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.WriteResult(w, r, &types.GetEnvGroupResponse{EnvGroup: envGroup})
			return
		}

		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	res := &types.GetEnvGroupResponse{
		EnvGroup: envGroup,
		StackID:  stackId,
	}

	c.WriteResult(w, r, res)
}
