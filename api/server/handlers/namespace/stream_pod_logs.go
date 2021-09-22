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
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/models"
)

type StreamPodLogsHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewStreamPodLogsHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *StreamPodLogsHandler {
	return &StreamPodLogsHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *StreamPodLogsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	conn, err := c.Config().WSUpgrader.Upgrade(w, r, nil)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	namespace := r.Context().Value(types.NamespaceScope).(string)
	name, _ := requestutils.GetURLParamString(r, types.URLParamPodName)

	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	agent, err := c.GetAgent(r, cluster)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	err = agent.GetPodLogs(namespace, name, conn)

	if targetErr := kubernetes.IsNotFoundError; errors.Is(err, targetErr) {
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
			fmt.Errorf("pod %s/%s was not found", namespace, name),
			http.StatusNotFound,
		))

		return
	} else if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}
}
