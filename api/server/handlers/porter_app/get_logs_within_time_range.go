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

	if (request.PodSelector != "" && request.ChartName != "") || (request.PodSelector == "" && request.ChartName == "") {
		err := telemetry.Error(ctx, span, nil, "must provide either pod selector or chart name")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

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
	}

	var podSelector string
	if request.ChartName == "" {
		podSelector = trimPodSelector(request.PodSelector)
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
							copyPod := pod
							latestPod = &copyPod
						}
					}
				}
			}
			if latestPod == nil {
				err = telemetry.Error(ctx, span, nil, "unable to retrieve logs for latest job")
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
		PodSelector: podSelector,
		Namespace:   request.Namespace,
		Direction:   request.Direction,
		SearchParam: request.SearchParam,
	}

	logs, err := porter_agent.GetHistoricalLogs(ctx, agent.Clientset, agentSvc, logRequest)
	if err != nil {
		_ = telemetry.Error(ctx, span, err, "unable to get logs")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(fmt.Errorf("unable to get logs for pod selector %s", podSelector), http.StatusInternalServerError))
		return
	}

	c.WriteResult(w, r, logs)
}

/**
 * Application pods are of the format <app-name>-<service-name>-<random-4-char-string>
 * The max length of a pod name is 63 characters
 * Therefore if the podSelector we try to use is longer than 58 characters (63 characters minus 4 characters for the random string minus 1 character for the last hyphen), then it won't match any pods
 * e.g. podSelector "postgres-snowflake-connector-postgres-snowflake-service-wkr-" (60 chars) won't work because the pod is actually named "postgres-snowflake-connector-postgres-snowflake-service-wkqcpz2"
 * so we trim the podSelector to "postgres-snowflake-connector-postgres-snowflake-service-wk" (58 characters) to ensure we match the pod
 * This is only to fix current pods; new pods will be named correctly because we imposed service name limits in https://github.com/porter-dev/porter/pull/3439
 * */
func trimPodSelector(podSelector string) string {
	if !strings.HasSuffix(podSelector, ".*") {
		return podSelector
	}
	podSelectorWithoutWildcard := strings.TrimSuffix(podSelector, ".*")
	if len(podSelectorWithoutWildcard) <= 58 {
		return podSelector
	}
	return fmt.Sprintf("%s.*", podSelectorWithoutWildcard[:58])
}
