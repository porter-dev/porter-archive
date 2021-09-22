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
	"helm.sh/helm/v3/pkg/release"
)

type GetJobsStatusHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewGetJobsStatusHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *GetJobsStatusHandler {
	return &GetJobsStatusHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *GetJobsStatusHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	helmRelease, _ := r.Context().Value(types.ReleaseScope).(*release.Release)
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)
	agent, err := c.GetAgent(r, cluster)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	jobs, err := agent.ListJobsByLabel(helmRelease.Namespace, getJobLabels(helmRelease)...)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	res := &types.GetJobsStatusResponse{}

	// get the most recent job
	if len(jobs) > 0 {
		mostRecentJob := jobs[0]

		for _, job := range jobs {
			createdAt := job.ObjectMeta.CreationTimestamp

			if mostRecentJob.CreationTimestamp.Before(&createdAt) {
				mostRecentJob = job
			}
		}

		res.StartTime = mostRecentJob.Status.StartTime

		// get the status of the most recent job
		if mostRecentJob.Status.Succeeded >= 1 {
			res.Status = "succeeded"
		} else if mostRecentJob.Status.Active >= 1 {
			res.Status = "running"
		} else if mostRecentJob.Status.Failed >= 1 {
			res.Status = "failed"
		}
	}

	c.WriteResult(w, r, res)
}
