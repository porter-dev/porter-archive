package release

import (
	"context"
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
	"github.com/porter-dev/porter/internal/telemetry"
	"github.com/stefanmcshane/helm/pkg/release"
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
	ctx := r.Context()
	ctx, span := telemetry.NewSpan(ctx, "serve-get-all-pods-for-release")
	defer span.End()

	helmRelease, _ := ctx.Value(types.ReleaseScope).(*release.Release)
	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)

	agent, err := c.GetAgent(r, cluster, "")
	if err != nil {
		err = fmt.Errorf("error getting agent: %w", err)
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	pods, err := GetPodsForRelease(ctx, helmRelease, agent)
	if err != nil {
		err = fmt.Errorf("error getting pods: %w", err)
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	c.WriteResult(w, r, pods)
}

func GetPodsForRelease(ctx context.Context, helmRelease *release.Release, k8sAgent *kubernetes.Agent) ([]v1.Pod, error) {
	ctx, span := telemetry.NewSpan(ctx, "get-all-pods-for-release")
	defer span.End()

	yamlArr := grapher.ImportMultiDocYAML([]byte(helmRelease.Manifest))
	controllers := grapher.ParseControllers(yamlArr)
	pods := make([]v1.Pod, 0)

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "num-controllers", Value: len(controllers)})
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "namespace", Value: helmRelease.Namespace})

	// get current status of each controller
	for _, controller := range controllers {
		controller.Namespace = helmRelease.Namespace
		_, selector, err := getController(controller, k8sAgent)
		if err != nil {
			telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "controller-name", Value: controller.Name})
			err = telemetry.Error(ctx, span, err, "error getting controller")
			return nil, err
		}

		selectors := make([]string, 0)

		if strings.ToLower(controller.Kind) == "cronjob" {
			// in the case of cronjobs, getting the pod is non-arbitrary. We only get the pod
			// declared by the manifest, which will have a certain revision attached. But the
			// label on the pod is the job name, not the cronjob name. So we first find the
			// list of jobs run by this cronjob, and then get the pods attached to that job.
			jobLabels := make([]kubernetes.Label, 0)

			for key, val := range selector.MatchLabels {
				jobLabels = append(jobLabels, kubernetes.Label{
					Key: key,
					Val: val,
				})
			}

			jobPods, err := getPodsForJobs(k8sAgent, helmRelease.Namespace, jobLabels)
			if err != nil {
				err = telemetry.Error(ctx, span, err, "error getting cronjob pods")
				return nil, err
			}

			pods = append(pods, jobPods...)

			continue
		} else if strings.ToLower(controller.Kind) == "job" {
			// in the case of jobs as the controller, we simply find the job matching the
			// pod name.
			selectors = append(selectors, "job-name="+controller.Name)
		} else {
			for key, val := range selector.MatchLabels {
				selectors = append(selectors, key+"="+val)
			}
		}

		podList, err := k8sAgent.GetPodsByLabel(strings.Join(selectors, ","), helmRelease.Namespace)
		if err != nil {
			err = telemetry.Error(ctx, span, err, "error getting pods")
			return nil, err
		}

		pods = append(pods, podList.Items...)

		podList, err = k8sAgent.GetPodsByLabel(strings.Join(selectors, ","), "default")
		if err != nil {
			err = telemetry.Error(ctx, span, err, "error getting pods")
			return nil, err
		}

		pods = append(pods, podList.Items...)
	}

	// we also check for jobs attached to this release
	labels := getJobLabels(helmRelease)

	labels = append(labels, kubernetes.Label{
		Key: "helm.sh/revision",
		Val: fmt.Sprintf("%d", helmRelease.Version),
	})

	jobPods, err := getPodsForJobs(k8sAgent, helmRelease.Namespace, labels)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error getting cronjob pods")
		return nil, err
	}

	pods = append(pods, jobPods...)

	return pods, nil
}

func getPodsForJobs(agent *kubernetes.Agent, namespace string, labels []kubernetes.Label) ([]v1.Pod, error) {
	pods := make([]v1.Pod, 0)

	jobs, err := agent.ListJobsByLabel(namespace, labels...)
	if err != nil {
		return nil, err
	}

	for _, job := range jobs {
		podList, err := agent.GetPodsByLabel("job-name="+job.Name, namespace)
		if err != nil {
			return nil, err
		}

		pods = append(pods, podList.Items...)
	}

	return pods, nil
}
