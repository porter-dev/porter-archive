package release

import (
	"net/http"
	"strings"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/helm/grapher"
	"github.com/porter-dev/porter/internal/models"
	"helm.sh/helm/v3/pkg/release"
	v1 "k8s.io/api/core/v1"
)

type GetAllPodsHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewGetAllPodsHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *GetAllPodsHandler {
	return &GetAllPodsHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *GetAllPodsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	helmRelease, _ := r.Context().Value(types.ReleaseScope).(*release.Release)
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	agent, err := c.GetAgent(r, cluster)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	yamlArr := grapher.ImportMultiDocYAML([]byte(helmRelease.Manifest))
	controllers := grapher.ParseControllers(yamlArr)
	pods := make([]v1.Pod, 0)

	// get current status of each controller
	for _, controller := range controllers {
		controller.Namespace = helmRelease.Namespace
		_, selector, err := getController(controller, agent)

		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}

		selectors := make([]string, 0)

		for key, val := range selector.MatchLabels {
			selectors = append(selectors, key+"="+val)
		}

		podList, err := agent.GetPodsByLabel(strings.Join(selectors, ","), helmRelease.Namespace)

		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}

		pods = append(pods, podList.Items...)
	}

	c.WriteResult(w, r, pods)
}
