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

type RemoveEnvGroupAppHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewRemoveEnvGroupAppHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *RemoveEnvGroupAppHandler {
	return &RemoveEnvGroupAppHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *RemoveEnvGroupAppHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	request := &types.AddEnvGroupApplicationRequest{}

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

	// read the attached configmap
	cm, _, err := agent.GetLatestVersionedConfigMap(request.Name, namespace)

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

	// TODO: verify that application exists

	cm, err = agent.RemoveApplicationFromVersionedConfigMap(cm, request.ApplicationName)

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

	res, err := toEnvGroup(cm)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	c.WriteResult(w, r, res)
}
