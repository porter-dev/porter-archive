package kube_events

import (
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
	"github.com/porter-dev/porter/internal/kubernetes/porter_agent"
	"github.com/porter-dev/porter/internal/models"
)

type GetKubeEventLogsHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewGetKubeEventLogsHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *GetKubeEventLogsHandler {
	return &GetKubeEventLogsHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *GetKubeEventLogsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)
	kubeEventID, _ := requestutils.GetURLParamUint(r, types.URLParamKubeEventID)

	kubeEvent, err := c.Repo().KubeEvent().ReadEvent(kubeEventID, proj.ID, cluster.ID)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// if the kube event is not a pod type, throw a bad request error to the user
	if strings.ToLower(kubeEvent.ResourceType) != "pod" {
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
			fmt.Errorf("event resource type must be pod to get logs"),
			http.StatusBadRequest,
		))

		return
	}

	req := &types.GetKubeEventLogsRequest{}

	if ok := c.DecodeAndValidate(w, r, req); !ok {
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

	resp, err := porter_agent.QueryPorterAgent(agent.Clientset, agentSvc, &porter_agent.PathOpts{
		Timestamp: req.Timestamp,
		Pod:       kubeEvent.Name,
		Namespace: kubeEvent.Namespace,
	})

	c.WriteResult(w, r, &types.GetKubeEventLogsResponse{
		Logs: resp.Logs,
	})
}
