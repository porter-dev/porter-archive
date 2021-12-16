package namespace

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"

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

type CreateEnvGroupHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewCreateEnvGroupHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *CreateEnvGroupHandler {
	return &CreateEnvGroupHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *CreateEnvGroupHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	request := &types.CreateEnvGroupRequest{}

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

	configMap, err := createEnvGroup(agent, types.ConfigMapInput{
		Name:            request.Name,
		Namespace:       namespace,
		Variables:       request.Variables,
		SecretVariables: request.SecretVariables,
	})

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	envGroup, err := toEnvGroup(configMap)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	c.WriteResult(w, r, envGroup)
}

func createEnvGroup(agent *kubernetes.Agent, input types.ConfigMapInput) (*v1.ConfigMap, error) {
	// look for a latest configmap
	_, latestVersion, err := agent.GetLatestVersionedConfigMap(input.Name, input.Namespace)

	if err != nil && !errors.Is(err, kubernetes.IsNotFoundError) {
		return nil, err
	} else if err != nil {
		latestVersion = 1
	} else {
		latestVersion += 1
	}

	// add all secret env variables to configmap with value PORTERSECRET_${configmap_name}
	for key := range input.SecretVariables {
		input.Variables[key] = fmt.Sprintf("PORTERSECRET_%s", input.Name)
	}

	cm, err := agent.CreateVersionedConfigMap(input.Name, input.Namespace, latestVersion, input.Variables)

	if err != nil {
		return nil, err
	}

	secretData := encodeSecrets(input.SecretVariables)

	// create secret first
	if _, err := agent.CreateLinkedVersionedSecret(input.Name, input.Namespace, cm.ObjectMeta.Name, latestVersion, secretData); err != nil {
		return nil, err
	}

	return cm, err
}

func toEnvGroup(configMap *v1.ConfigMap) (*types.EnvGroup, error) {
	res := &types.EnvGroup{
		Namespace: configMap.ObjectMeta.Namespace,
		Variables: configMap.Data,
	}

	// get the name
	name, nameExists := configMap.Labels["envgroup"]

	if !nameExists {
		return nil, fmt.Errorf("not a valid configmap: envgroup label does not exist")
	}

	res.Name = name

	// get the version
	versionLabelStr, versionLabelExists := configMap.Labels["version"]

	if !versionLabelExists {
		return nil, fmt.Errorf("not a valid configmap: version label does not exist")
	}

	versionInt, err := strconv.Atoi(versionLabelStr)

	if err != nil {
		return nil, fmt.Errorf("not a valid configmap, error converting version: %v", err)
	}

	res.Version = uint(versionInt)

	// get applications, if they exist
	appStr, appAnnonExists := configMap.Annotations[kubernetes.PorterAppAnnotationName]

	if appAnnonExists && appStr != "" {
		res.Applications = strings.Split(appStr, ",")
	} else {
		res.Applications = []string{}
	}

	return res, nil
}
