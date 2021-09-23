package namespace

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type RenameConfigMapHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewRenameConfigMapHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *RenameConfigMapHandler {
	return &RenameConfigMapHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *RenameConfigMapHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	request := &types.RenameConfigMapRequest{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	if request.NewName == request.Name {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	namespace := r.Context().Value(types.NamespaceScope).(string)
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	agent, err := c.GetAgent(r, cluster, "")

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	configMap, err := agent.GetConfigMap(request.Name, namespace)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	secret, err := agent.GetSecret(configMap.Name, configMap.Namespace)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	var decodedSecretData = make(map[string]string)
	for k, v := range secret.Data {
		decodedSecretData[k] = string(v)
	}

	newConfigMap, err := createConfigMap(agent, types.ConfigMapInput{
		Name:            request.NewName,
		Namespace:       namespace,
		Variables:       configMap.Data,
		SecretVariables: decodedSecretData,
	})
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	if err := deleteConfigMap(agent, configMap.Name, configMap.Namespace); err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	res := types.RenameConfigMapResponse{
		ConfigMap: newConfigMap,
	}

	c.WriteResult(w, r, res)
}
