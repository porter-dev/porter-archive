package cluster

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	porter_agent "github.com/porter-dev/porter/internal/kubernetes/porter_agent/v2"
	"github.com/porter-dev/porter/internal/models"
)

type GetLogRevisionValuesHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewGetLogRevisionValuesHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *GetLogRevisionValuesHandler {
	return &GetLogRevisionValuesHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *GetLogRevisionValuesHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	request := &types.GetRevisionValuesRequest{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	agent, err := c.GetAgent(r, cluster, "")

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// get agent service
	agentSvc, err := porter_agent.GetAgentService(agent.Clientset)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	revisions, err := porter_agent.GetRevisionValues(agent.Clientset, agentSvc, request)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	c.WriteResult(w, r, revisions)
}
