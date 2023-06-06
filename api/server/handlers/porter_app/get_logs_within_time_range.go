package porter_app

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	porter_agent "github.com/porter-dev/porter/internal/kubernetes/porter_agent/v2"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
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
	ctx, span := telemetry.NewSpan(r.Context(), "serve-get-logs-within-time-range")
	defer span.End()
	r = r.Clone(ctx)
	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)

	request := &types.GetChartLogsWithinTimeRangeRequest{}
	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	if request.StartRange.IsZero() || request.EndRange.IsZero() {
		err := telemetry.Error(ctx, span, nil, "must provide start and end range")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	request.StartRange = request.StartRange.Add(-1 * time.Minute)
	request.EndRange = request.EndRange.Add(1 * time.Minute)

	agent, err := c.GetAgent(r, cluster, "")
	if err != nil {
		_ = telemetry.Error(ctx, span, err, "unable to get agent")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(fmt.Errorf("unable to get agent"), http.StatusInternalServerError))
		return
	}

	// get agent service
	agentSvc, err := porter_agent.GetAgentService(agent.Clientset)
	if err != nil {
		_ = telemetry.Error(ctx, span, err, "unable to get agent service")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(fmt.Errorf("unable to get agent service"), http.StatusInternalServerError))
		return
	}

	podValuesRequest := &types.GetPodValuesRequest{
		StartRange:  &request.StartRange,
		EndRange:    &request.EndRange,
		Namespace:   request.Namespace,
		MatchPrefix: request.ChartName,
		Revision:    request.Revision,
	}

	var podSelector string
	if request.ChartName == "" {
		if request.PodSelector == "" {
			err = telemetry.Error(ctx, span, nil, "must provide either chart name or pod selector")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
			return
		}
		podSelector = request.PodSelector
	} else {
		// get the pod values which will be used to get the correct pod selector
		podVals, err := porter_agent.GetPodValues(agent.Clientset, agentSvc, podValuesRequest)
		if err != nil {
			_ = telemetry.Error(ctx, span, err, "unable to get pod values")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}

		if len(podVals) == 0 {
			err = telemetry.Error(ctx, span, nil, "no pods found within timerange")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusNotFound))
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
					_ = telemetry.Error(ctx, span, err, "unable to get pods for job")
					c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(fmt.Errorf("unable to get pods for job"), http.StatusInternalServerError))
					return
				}
				for _, pod := range pods {
					if pod.GetCreationTimestamp().Time.After(request.StartRange) && pod.GetCreationTimestamp().Time.Before(request.EndRange) {
						if latestPod == nil || pod.GetCreationTimestamp().Time.After(latestPod.GetCreationTimestamp().Time) {
							latestPod = &pod
						}
					}
				}
			}
			if latestPod == nil {
				err = telemetry.Error(ctx, span, nil, "no pods found within timerange")
				c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusNotFound))
				return
			}
			podSelector = latestPod.Name
		}
	}

	telemetry.WithAttributes(
		span,
		telemetry.AttributeKV{Key: "pod-selector", Value: podSelector},
		telemetry.AttributeKV{Key: "start-range", Value: request.StartRange.String()},
		telemetry.AttributeKV{Key: "end-range", Value: request.EndRange.String()},
	)

	logRequest := &types.GetLogRequest{
		Limit:       request.Limit,
		StartRange:  &request.StartRange,
		EndRange:    &request.EndRange,
		Revision:    request.Revision,
		PodSelector: podSelector,
		Namespace:   request.Namespace,
	}

	logs, err := porter_agent.GetHistoricalLogs(agent.Clientset, agentSvc, logRequest)
	if err != nil {
		_ = telemetry.Error(ctx, span, err, "unable to get logs")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(fmt.Errorf("unable to get logs for pod selector %s", podSelector), http.StatusInternalServerError))
		return
	}

	c.WriteResult(w, r, logs)
}
