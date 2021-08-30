package namespace

import (
	"fmt"
	"net/http"

	v1 "k8s.io/api/core/v1"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/models"
)

type CreateConfigMapHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewCreateConfigMapHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *CreateConfigMapHandler {
	return &CreateConfigMapHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *CreateConfigMapHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	request := &types.CreateConfigMapRequest{}

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

	configMap, err := createConfigMap(agent, namespace, request)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	var res = types.CreateConfigMapResponse{
		ConfigMap: configMap,
	}

	c.WriteResult(w, r, res)
}

func createConfigMap(agent *kubernetes.Agent, namespace string, request *types.CreateConfigMapRequest) (*v1.ConfigMap, error) {
	secretData := make(map[string][]byte)

	for key, rawValue := range request.SecretVariables {
		// encodedValue := base64.StdEncoding.EncodeToString([]byte(rawValue))

		// if err != nil {
		// 	app.handleErrorInternal(err, w)
		// 	return
		// }

		secretData[key] = []byte(rawValue)
	}

	// create secret first
	if _, err := agent.CreateLinkedSecret(request.Name, namespace, request.Name, secretData); err != nil {
		return nil, err
	}

	// add all secret env variables to configmap with value PORTERSECRET_${configmap_name}
	for key := range request.SecretVariables {
		request.Variables[key] = fmt.Sprintf("PORTERSECRET_%s", request.Name)
	}

	return agent.CreateConfigMap(request.Name, namespace, request.Variables)
}
