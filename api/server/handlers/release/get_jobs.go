package release

import (
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
	"github.com/stefanmcshane/helm/pkg/release"
)

type GetJobsHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewGetJobsHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *GetJobsHandler {
	return &GetJobsHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *GetJobsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	request := &types.GetJobsRequest{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	helmRelease, _ := r.Context().Value(types.ReleaseScope).(*release.Release)
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)
	agent, err := c.GetAgent(r, cluster, "")
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	labels := getJobLabels(helmRelease)

	if request.Revision != 0 {
		labels = append(labels, kubernetes.Label{
			Key: "helm.sh/revision",
			Val: fmt.Sprintf("%d", request.Revision),
		})
	}

	jobs, err := agent.ListJobsByLabel(helmRelease.Namespace, labels...)
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	c.WriteResult(w, r, jobs)
}

func getJobLabels(helmRelease *release.Release) []kubernetes.Label {
	return []kubernetes.Label{
		{
			Key: "helm.sh/chart",
			Val: fmt.Sprintf("%s-%s", helmRelease.Chart.Metadata.Name, helmRelease.Chart.Metadata.Version),
		},
		{
			Key: "meta.helm.sh/release-name",
			Val: helmRelease.Name,
		},
	}
}
