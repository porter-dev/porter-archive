package namespace

import (
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type UpdateConfigMapHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewUpdateConfigMapHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *UpdateConfigMapHandler {
	return &UpdateConfigMapHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *UpdateConfigMapHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	request := &types.UpdateConfigMapRequest{}

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

	secretData := encodeSecrets(request.SecretVariables)

	// create secret first
	err = agent.UpdateLinkedSecret(request.Name, namespace, request.Name, secretData)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// add all secret env variables to configmap with value PORTERSECRET_${configmap_name}
	for key, val := range request.SecretVariables {
		// if val is empty and key does not exist in configmap already, set to empty
		if _, found := request.Variables[key]; val == "" && !found {
			request.Variables[key] = ""
		} else if val != "" {
			request.Variables[key] = fmt.Sprintf("PORTERSECRET_%s", request.Name)
		}
	}

	configMap, err := agent.UpdateConfigMap(request.Name, namespace, request.Variables)

	res := types.UpdateConfigMapResponse{
		ConfigMap: configMap,
	}

	c.WriteResult(w, r, res)
}
