package release

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/stefanmcshane/helm/pkg/release"
)

type GetLatestJobRunHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewGetLatestJobRunHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *GetLatestJobRunHandler {
	return &GetLatestJobRunHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *GetLatestJobRunHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	helmRelease, _ := r.Context().Value(types.ReleaseScope).(*release.Release)
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)
	agent, err := c.GetAgent(r, cluster, "")

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	jobs, err := agent.ListJobsByLabel(helmRelease.Namespace, getJobLabels(helmRelease)...)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// get the most recent job
	if len(jobs) > 0 {
		mostRecentJob := jobs[0]

		for _, job := range jobs {
			createdAt := job.ObjectMeta.CreationTimestamp

			if mostRecentJob.CreationTimestamp.Before(&createdAt) {
				mostRecentJob = job
			}
		}

		c.WriteResult(w, r, mostRecentJob)
	}
}
