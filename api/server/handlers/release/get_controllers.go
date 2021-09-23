package release

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
	"github.com/porter-dev/porter/internal/helm/grapher"
	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/models"
	"helm.sh/helm/v3/pkg/release"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

type GetControllersHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewGetControllersHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *GetControllersHandler {
	return &GetControllersHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *GetControllersHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	helmRelease, _ := r.Context().Value(types.ReleaseScope).(*release.Release)
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	agent, err := c.GetAgent(r, cluster, "")

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	yamlArr := grapher.ImportMultiDocYAML([]byte(helmRelease.Manifest))
	controllers := grapher.ParseControllers(yamlArr)
	retrievedControllers := []interface{}{}

	// get current status of each controller
	for _, controller := range controllers {
		controller.Namespace = helmRelease.Namespace
		rc, _, err := getController(controller, agent)

		if targetErr := kubernetes.IsNotFoundError; errors.Is(err, targetErr) {
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
				fmt.Errorf("%s/%s of kind %s was not found", controller.Namespace, controller.Name, controller.Kind),
				http.StatusNotFound,
			))

			return
		} else if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}

		retrievedControllers = append(retrievedControllers, rc)
	}

	c.WriteResult(w, r, retrievedControllers)
}

func getController(controller grapher.Object, agent *kubernetes.Agent) (rc interface{}, selector *metav1.LabelSelector, err error) {
	switch strings.ToLower(controller.Kind) {
	case "deployment":
		obj, err := agent.GetDeployment(controller)

		if err != nil {
			return nil, nil, err
		}

		return obj, obj.Spec.Selector, nil
	case "statefulset":
		obj, err := agent.GetStatefulSet(controller)

		if err != nil {
			return nil, nil, err
		}

		return obj, obj.Spec.Selector, nil
	case "daemonset":
		obj, err := agent.GetDaemonSet(controller)

		if err != nil {
			return nil, nil, err
		}

		return obj, obj.Spec.Selector, nil
	case "replicaset":
		obj, err := agent.GetReplicaSet(controller)

		if err != nil {
			return nil, nil, err
		}

		return obj, obj.Spec.Selector, nil
	case "cronjob":
		obj, err := agent.GetCronJob(controller)

		if err != nil {
			return nil, nil, err
		}

		return obj, obj.Spec.JobTemplate.Spec.Selector, nil
	}

	return nil, nil, fmt.Errorf("not a valid controller")
}
