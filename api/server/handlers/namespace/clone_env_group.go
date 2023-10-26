package namespace

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
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/kubernetes/envgroup"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

type CloneEnvGroupHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewCloneEnvGroupHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *CloneEnvGroupHandler {
	return &CloneEnvGroupHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *CloneEnvGroupHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "clone-env-group-legacy")
	defer span.End()

	request := &types.CloneEnvGroupRequest{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	namespace := r.Context().Value(types.NamespaceScope).(string)
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	agent, err := c.GetAgent(r, cluster, "")
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error getting kubernetes agent")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	cm, _, err := agent.GetLatestVersionedConfigMap(request.SourceName, namespace)
	if err != nil {
		if errors.Is(err, kubernetes.IsNotFoundError) {
			_ = telemetry.Error(ctx, span, err, "error finding latest config map")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
				fmt.Errorf("error cloning env group: envgroup %s in namespace %s not found", request.SourceName, namespace), http.StatusNotFound,
				"no config map found for envgroup",
			))
			return
		}

		err = telemetry.Error(ctx, span, err, "error getting latest config map")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	secret, _, err := agent.GetLatestVersionedSecret(request.SourceName, namespace)
	if err != nil {
		if errors.Is(err, kubernetes.IsNotFoundError) {
			_ = telemetry.Error(ctx, span, err, "error finding latest secret")

			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
				fmt.Errorf("error cloning env group: envgroup %s in namespace %s not found", request.SourceName, namespace), http.StatusNotFound,
				"no k8s secret found for envgroup",
			))
			return
		}

		err = telemetry.Error(ctx, span, err, "error getting secret")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	if request.TargetName == "" {
		request.TargetName = request.SourceName
	}

	vars := make(map[string]string)
	secretVars := make(map[string]string)

	for key, val := range cm.Data {
		if !strings.Contains(val, "PORTERSECRET") {
			vars[key] = val
		}
	}

	for key, val := range secret.Data {
		secretVars[key] = string(val)
	}

	_, err = agent.Clientset.CoreV1().Namespaces().Get(ctx, namespace, metav1.GetOptions{})
	if err != nil {
		if !errors.Is(err, kubernetes.IsNotFoundError) {
			err = telemetry.Error(ctx, span, err, "error getting namespace")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}

		_, err = agent.Clientset.CoreV1().Namespaces().Create(ctx, &v1.Namespace{
			TypeMeta: metav1.TypeMeta{
				Kind:       "Namespace",
				APIVersion: "v1",
			},
			ObjectMeta: metav1.ObjectMeta{
				Name: namespace,
			},
		}, metav1.CreateOptions{})
		if err != nil {
			err = telemetry.Error(ctx, span, err, "error creating namespace")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}
	}

	configMap, err := envgroup.CreateEnvGroup(agent, types.ConfigMapInput{
		Name:            request.TargetName,
		Namespace:       request.TargetNamespace,
		Variables:       vars,
		SecretVariables: secretVars,
	})
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error creating env group")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	envGroup, err := envgroup.ToEnvGroup(configMap)
	if err != nil {

		err = telemetry.Error(ctx, span, err, "error converting env group")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	c.WriteResult(w, r, envGroup)
}
