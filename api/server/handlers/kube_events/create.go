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
	"github.com/porter-dev/porter/internal/integrations/slack"
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

	if strings.ToLower(string(request.EventType)) == "critical" && strings.ToLower(request.ResourceType) == "pod" {
		err := notifyPodCrashing(c.Config(), proj, cluster, request)

		if err != nil {
			c.HandleAPIErrorNoWrite(w, r, apierrors.NewErrInternal(err))
		}
	}
}

func notifyPodCrashing(
	config *config.Config,
	project *models.Project,
	cluster *models.Cluster,
	event *types.CreateKubeEventRequest,
) error {
	// attempt to get a matching Porter release to get the notification configuration
	var conf *models.NotificationConfig
	var notifConfig *types.NotificationConfig
	var err error
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

		if err == nil {
			notifConfig = conf.ToNotificationConfigType()
		}
	} else if err != nil {
		return err
	} else if err == nil && conf != nil {
		if !conf.ShouldNotify() {
			return nil
		}

		notifConfig = conf.ToNotificationConfigType()
	}

	slackInts, _ := config.Repo.SlackIntegration().ListSlackIntegrationsByProjectID(project.ID)

	notifier := slack.NewSlackNotifier(notifConfig, slackInts...)

	notifyOpts := &slack.NotifyOpts{
		ProjectID:   cluster.ProjectID,
		ClusterID:   cluster.ID,
		ClusterName: cluster.Name,
		Name:        event.OwnerName,
		Namespace:   event.Namespace,
		Info:        fmt.Sprintf("%s:%s", event.Reason, event.Message),
		URL: fmt.Sprintf(
			"%s/applications/%s/%s/%s?project_id=%d",
			config.ServerConf.ServerURL,
			url.PathEscape(cluster.Name),
			matchedRel.Namespace,
			matchedRel.Name,
			cluster.ProjectID,
		),
	}

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
