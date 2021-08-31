package release

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/helm/grapher"
	"github.com/porter-dev/porter/internal/models"
	"helm.sh/helm/v3/pkg/release"
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

	agent, err := c.GetAgent(r, cluster)

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
		var rc interface{}

		switch controller.Kind {
		case "Deployment":
			rc, err = agent.GetDeployment(controller)
		case "StatefulSet":
			rc, err = agent.GetStatefulSet(controller)
		case "DaemonSet":
			rc, err = agent.GetDaemonSet(controller)
		case "ReplicaSet":
			rc, err = agent.GetReplicaSet(controller)
		case "CronJob":
			rc, err = agent.GetCronJob(controller)
		}

		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}

		retrievedControllers = append(retrievedControllers, rc)
	}

	c.WriteResult(w, r, retrievedControllers)
}
