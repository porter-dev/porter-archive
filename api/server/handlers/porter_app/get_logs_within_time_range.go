package porter_app

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	porter_agent "github.com/porter-dev/porter/internal/kubernetes/porter_agent/v2"
	"github.com/porter-dev/porter/internal/models"
	v1 "k8s.io/api/core/v1"
)

type GetLogsWithinTimeRangeHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewGetLogsWithinTimeRangeHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *GetLogsWithinTimeRangeHandler {
	return &GetLogsWithinTimeRangeHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *GetLogsWithinTimeRangeHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	request := &types.GetChartLogsWithinTimeRangeRequest{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	agent, err := c.GetAgent(r, cluster, "")
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// get agent service
	agentSvc, err := porter_agent.GetAgentService(agent.Clientset)
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	podValuesRequest := &types.GetPodValuesRequest{
		StartRange:  request.StartRange,
		EndRange:    request.EndRange,
		Namespace:   request.Namespace,
		MatchPrefix: request.ChartName,
		Revision:    request.Revision,
	}

	var podSelector string
	if request.ChartName == "" {
		if request.PodSelector == "" {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("must provide either chart name or pod selector")))
			return
		}
		podSelector = request.PodSelector
	} else {
		// get the pod values which will be used to get the correct pod selector
		podVals, err := porter_agent.GetPodValues(agent.Clientset, agentSvc, podValuesRequest)
		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}

		if len(podVals) == 0 {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("no pods found within timerange")))
			return
		}
		if len(podVals) == 1 {
			podSelector = podVals[0]
		} else {
			// TODO: why are pods being returned from get pod values whose timestamps don't overlap with the search range??
			// hacky workaround for the above bug, only for jobs - get the pods, and then filter them by timestamp
			var latestPod *v1.Pod
			for _, v := range podVals {
				name := strings.Split(v, "-hook")[0] + "-hook"
				pods, err := agent.GetJobPods(request.Namespace, name)
				if err != nil {
					c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
					return
				}
				for _, pod := range pods {
					if pod.GetCreationTimestamp().Time.After(*request.StartRange) && pod.GetCreationTimestamp().Time.Before(*request.EndRange) {
						if latestPod == nil || pod.GetCreationTimestamp().Time.After(latestPod.GetCreationTimestamp().Time) {
							latestPod = &pod
						}
					}
				}
			}
			if latestPod == nil {
				c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("no pods found within timerange")))
				return
			}
			podSelector = latestPod.Name
		}
	}

	logRequest := &types.GetLogRequest{
		Limit:       request.Limit,
		StartRange:  request.StartRange,
		EndRange:    request.EndRange,
		Revision:    request.Revision,
		PodSelector: podSelector,
		Namespace:   request.Namespace,
	}

	logs, err := porter_agent.GetHistoricalLogs(agent.Clientset, agentSvc, logRequest)
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	c.WriteResult(w, r, logs)
}
