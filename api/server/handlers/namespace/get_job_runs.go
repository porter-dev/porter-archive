package namespace

import (
	"net/http"
	"sort"
	"strings"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	v1 "k8s.io/api/batch/v1"
)

type GetJobRunsHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewGetJobRunsHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *GetJobRunsHandler {
	return &GetJobRunsHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *GetJobRunsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	request := &types.GetJobRunsRequest{}

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

	allJobs, err := agent.ListAllJobs(namespace)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	var jobs []v1.Job

	if strings.ToLower(request.Status) == "failed" {
		for _, job := range allJobs {
			if job.Status.Failed > 0 {
				jobs = append(jobs, job)
			}
		}
	} else if strings.ToLower(request.Status) == "succeeded" {
		for _, job := range allJobs {
			if job.Status.Succeeded > 0 {
				jobs = append(jobs, job)
			}
		}
	} else if strings.ToLower(request.Status) == "running" {
		for _, job := range allJobs {
			if job.Status.Active > 0 {
				jobs = append(jobs, job)
			}
		}
	} else {
		// return all
		jobs = append(jobs, allJobs...)
	}

	if strings.ToLower(request.Sort) == "oldest" {
		sort.Sort(sortByOldest(jobs))
	} else if strings.ToLower(request.Sort) == "alphabetical" {
		sort.Sort(sortByAlphabetical(jobs))
	} else {
		// sort by newest
		sort.Sort(sortByNewest(jobs))
	}

	c.WriteResult(w, r, jobs)
}

type sortByNewest []v1.Job

func (s sortByNewest) Len() int {
	return len(s)
}

func (s sortByNewest) Swap(i, j int) {
	s[i], s[j] = s[j], s[i]
}

func (s sortByNewest) Less(i, j int) bool {
	return s[i].CreationTimestamp.Unix() > s[j].CreationTimestamp.Unix()
}

type sortByOldest []v1.Job

func (s sortByOldest) Len() int {
	return len(s)
}

func (s sortByOldest) Swap(i, j int) {
	s[i], s[j] = s[j], s[i]
}

func (s sortByOldest) Less(i, j int) bool {
	return s[i].CreationTimestamp.Unix() < s[j].CreationTimestamp.Unix()
}

type sortByAlphabetical []v1.Job

func (s sortByAlphabetical) Len() int {
	return len(s)
}

func (s sortByAlphabetical) Swap(i, j int) {
	s[i], s[j] = s[j], s[i]
}

func (s sortByAlphabetical) Less(i, j int) bool {
	return s[i].Name < s[j].Name
}
