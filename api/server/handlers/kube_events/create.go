package kube_events

import (
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/helm/grapher"
	"github.com/porter-dev/porter/internal/integrations/slack"
	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/models"
	"gorm.io/gorm"
)

type CreateKubeEventHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewCreateKubeEventHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *CreateKubeEventHandler {
	return &CreateKubeEventHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *CreateKubeEventHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	request := &types.CreateKubeEventRequest{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	// Look for an event matching by the name, namespace, and was last updated within the
	// grouping threshold time. If so, we append a subevent to the existing event.
	kubeEvent, err := c.Repo().KubeEvent().ReadEventByGroup(proj.ID, cluster.ID, &types.GroupOptions{
		Name:          request.Name,
		Namespace:     request.Namespace,
		ResourceType:  request.ResourceType,
		ThresholdTime: time.Now().Add(-15 * time.Minute),
	})

	foundMatchedEvent := kubeEvent != nil

	if !foundMatchedEvent {
		kubeEvent, err = c.Repo().KubeEvent().CreateEvent(&models.KubeEvent{
			ProjectID:    proj.ID,
			ClusterID:    cluster.ID,
			ResourceType: request.ResourceType,
			Name:         request.Name,
			OwnerType:    request.OwnerType,
			OwnerName:    request.OwnerName,
			Namespace:    request.Namespace,
		})

		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}
	}

	// append the subevent to the event
	err = c.Repo().KubeEvent().AppendSubEvent(kubeEvent, &models.KubeSubEvent{
		EventType: request.EventType,
		Message:   request.Message,
		Reason:    request.Reason,
		Timestamp: request.Timestamp,
	})

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	w.WriteHeader(http.StatusCreated)

	if strings.ToLower(string(request.EventType)) == "critical" &&
		strings.ToLower(request.ResourceType) == "pod" &&
		request.Message != "Unable to determine the root cause of the error" {
		agent, err := c.GetAgent(r, cluster, request.Namespace)

		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}

		err = notifyPodCrashing(c.Config(), agent, proj, cluster, request)

		if err != nil {
			c.HandleAPIErrorNoWrite(w, r, apierrors.NewErrInternal(err))
		}
	}
}

func mapKubeEventToMessage(event *types.CreateKubeEventRequest) string {
	if strings.HasSuffix(event.Reason, "RunContainerError") {
		if strings.Contains(event.Message, "exec:") {
			return fmt.Sprintf("Application launch error: %s\n",
				strings.Split(strings.SplitAfter(event.Message, "exec: ")[1], ": unknown")[0])
		}
	} else if strings.HasSuffix(event.Reason, "ImagePullBackOff") {
		return "Deployment error: The application image could not be pulled from the registry"
	}

	return event.Message
}

func notifyPodCrashing(
	config *config.Config,
	agent *kubernetes.Agent,
	project *models.Project,
	cluster *models.Cluster,
	event *types.CreateKubeEventRequest,
) error {
	// if cluster has notifications turned off, don't alert
	if cluster.NotificationsDisabled {
		return nil
	}

	// attempt to get a matching Porter release to get the notification configuration
	var conf *models.NotificationConfig
	var notifConfig *types.NotificationConfig
	var notifyOpts *slack.NotifyOpts
	var matchedRel *models.Release
	var err error

	if isJob := strings.ToLower(event.OwnerType) == "job"; isJob {
		// check that the job alert is valid and get proper message
		jobOwner, jobMsg, jobName, shouldAlert, err := getJobAlert(agent, event.Name, event.Namespace)

		if err != nil {
			return err
		} else if !shouldAlert {
			return nil
		}

		// look for a matching job notification config
		jobNC, err := config.Repo.JobNotificationConfig().ReadNotificationConfig(project.ID, cluster.ID, jobName, event.Namespace)

		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}

		if err != nil && errors.Is(err, gorm.ErrRecordNotFound) {
			// if the job notification config does not exist, create it
			jobNC = &models.JobNotificationConfig{
				Name:             jobName,
				Namespace:        event.Namespace,
				ProjectID:        project.ID,
				ClusterID:        cluster.ID,
				LastNotifiedTime: time.Now(),
			}

			jobNC, err = config.Repo.JobNotificationConfig().CreateNotificationConfig(jobNC)

			if err != nil {
				return err
			}
		} else if err != nil {
			return err
		} else if err == nil && jobNC != nil {
			// If the job notification config does exist, check if the job notification config states that
			// a notification should happen. If so, notify.
			if !jobNC.ShouldNotify() {
				return nil
			}
		}

		notifyOpts = &slack.NotifyOpts{
			ProjectID:   cluster.ProjectID,
			ClusterID:   cluster.ID,
			ClusterName: cluster.Name,
			Name:        jobOwner,
			Namespace:   event.Namespace,
			Info:        fmt.Sprintf("%s", jobMsg),
			Timestamp:   &event.Timestamp,
			URL: fmt.Sprintf(
				"%s/jobs/%s/%s/%s?project_id=%d&job=%s",
				config.ServerConf.ServerURL,
				cluster.Name,
				event.Namespace,
				jobOwner,
				cluster.ProjectID,
				jobName,
			),
		}
	} else {
		matchedRel := getMatchedPorterRelease(config, cluster.ID, event.OwnerName, event.Namespace)

		// for now, we only notify for Porter releases that have been deployed through Porter
		if matchedRel == nil {
			return nil
		}

		conf, err = config.Repo.NotificationConfig().ReadNotificationConfig(matchedRel.NotificationConfig)

		if err != nil && errors.Is(err, gorm.ErrRecordNotFound) {
			conf = &models.NotificationConfig{
				Enabled: true,
				Success: true,
				Failure: true,
			}

			conf, err = config.Repo.NotificationConfig().CreateNotificationConfig(conf)

			if err != nil {
				return err
			}

			if err != nil {
				return err
			}

			matchedRel.NotificationConfig = conf.ID
			matchedRel, err = config.Repo.Release().UpdateRelease(matchedRel)

			if err != nil {
				return err
			}

			notifConfig = conf.ToNotificationConfigType()
		} else if err != nil {
			return err
		} else if err == nil && conf != nil {
			if !conf.ShouldNotify() {
				return nil
			}

			notifConfig = conf.ToNotificationConfigType()
		}

		notifyOpts = &slack.NotifyOpts{
			ProjectID:   cluster.ProjectID,
			ClusterID:   cluster.ID,
			ClusterName: cluster.Name,
			Name:        event.OwnerName,
			Namespace:   event.Namespace,
			Info:        mapKubeEventToMessage(event),
			URL: fmt.Sprintf(
				"%s/applications/%s/%s/%s?project_id=%d",
				config.ServerConf.ServerURL,
				url.PathEscape(cluster.Name),
				matchedRel.Namespace,
				matchedRel.Name,
				cluster.ProjectID,
			),
		}
	}

	slackInts, _ := config.Repo.SlackIntegration().ListSlackIntegrationsByProjectID(project.ID)

	notifier := slack.NewSlackNotifier(notifConfig, slackInts...)
	notifyOpts.Status = slack.StatusPodCrashed

	err = notifier.Notify(notifyOpts)

	if err != nil {
		return err
	}

	// update the last updated time
	if matchedRel != nil && conf != nil {
		conf.LastNotifiedTime = time.Now()
		conf, err = config.Repo.NotificationConfig().UpdateNotificationConfig(conf)
	}

	return err
}

// getMatchedPorterRelease attempts to find a matching Porter release from the name of a controller.
// For example, if the controller has a suffix "-web", it is likely a Porter web application, and
// so we query for a Porter release with a matching name. Returns nil if no match is found
func getMatchedPorterRelease(config *config.Config, clusterID uint, ownerName, namespace string) *models.Release {
	matchingName := ""

	if strings.Contains(ownerName, "-web") {
		matchingName = strings.Split(ownerName, "-web")[0]
	} else if strings.Contains(ownerName, "-worker") {
		matchingName = strings.Split(ownerName, "-worker")[0]
	} else if strings.Contains(ownerName, "-job") {
		matchingName = strings.Split(ownerName, "-job")[0]
	}

	rel, err := config.Repo.Release().ReadRelease(clusterID, matchingName, namespace)

	if err != nil {
		return nil
	}

	return rel
}

func getJobAlert(agent *kubernetes.Agent, name, namespace string) (
	ownerName string,
	msg string,
	jobName string,
	shouldAlert bool,
	err error,
) {
	ownerName = ""

	pod, err := agent.GetPodByName(name, namespace)

	// if the pod is not found, we should not alert for this pod
	if err != nil && errors.Is(err, kubernetes.IsNotFoundError) {
		return "", "", "", false, nil
	} else if err != nil {
		return "", "", "", false, err
	}

	ownerJobName := ""

	// get the owner name for the pod by looking at the owner reference
	if ownerRefArr := pod.ObjectMeta.OwnerReferences; len(ownerRefArr) > 0 {
		for _, ownerRef := range ownerRefArr {
			if strings.ToLower(ownerRef.Kind) == "job" {
				ownerJobName = ownerRef.Name
			}
		}
	}

	if ownerJobName == "" {
		return "", "", "", false, nil
	}

	// lookup the job in the cluster
	job, err := agent.GetJob(grapher.Object{
		Kind:      "Job",
		Name:      ownerJobName,
		Namespace: namespace,
	})

	if err != nil {
		return "", "", "", false, nil
	}

	if jobReleaseLabel, exists := job.ObjectMeta.Labels["meta.helm.sh/release-name"]; exists {
		ownerName = jobReleaseLabel
	}

	// if we don't have an owner name, don't alert -- the link will be broken
	if ownerName == "" {
		return "", "", "", false, nil
	}

	// only alert for jobs that are newer than 24 hours
	if podTime := pod.Status.StartTime; podTime != nil && podTime.After(time.Now().Add(-24*time.Hour)) {
		// find container statuses relating to the actual job container. We don't alert on sidecar containers
		for _, containerStatus := range pod.Status.ContainerStatuses {
			if containerStatus.Name != "sidecar" && containerStatus.Name != "cloud-sql-proxy" {
				state := containerStatus.State
				if state.Terminated != nil && state.Terminated.ExitCode != 0 {
					// before alerting, we check pod events to make sure the pod was not moved due to normal behavior such as scale down
					events, err := agent.ListEvents(name, namespace)

					if err == nil && len(events.Items) > 0 {
						for _, event := range events.Items {
							// if event is ScaleDown, don't alert
							if event.Reason == "ScaleDown" && strings.Contains(event.Message, "deleting pod for node scale down") {
								return ownerName, "", ownerJobName, false, nil
							}
						}
					}

					// next, if the exit code is 255, we check that the job doesn't have a different associated pod.
					// exit code 255 can mean this pod was moved to a different node due to node eviction, scaledown,
					// unhealthy node, etc
					if state.Terminated.ExitCode == 255 {
						jobPods, err := agent.GetJobPods(namespace, ownerJobName)

						if err == nil && len(jobPods) > 0 {
							for _, jobPod := range jobPods {
								if jobPod.ObjectMeta.Name != name {
									return ownerName, "", ownerJobName, false, nil
								}
							}
						}
					}

					msg := fmt.Sprintf("Job terminated with non-zero exit code: exit code %d.", state.Terminated.ExitCode)

					if state.Terminated.Message != "" {
						msg += fmt.Sprintf(" Error: %s", state.Terminated.Message)
					}

					return ownerName, msg, ownerJobName, true, nil
				}
			}
		}
	}

	return "", "", "", false, nil
}
