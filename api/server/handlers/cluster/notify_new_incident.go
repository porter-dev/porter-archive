package cluster

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
	"github.com/porter-dev/porter/internal/integrations/slack"
	porter_agent "github.com/porter-dev/porter/internal/kubernetes/porter_agent/v2"
	"github.com/porter-dev/porter/internal/models"
)

type NotifyNewIncidentHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewNotifyNewIncidentHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *NotifyNewIncidentHandler {
	return &NotifyNewIncidentHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *NotifyNewIncidentHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	request := &porter_agent.Incident{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	// FIXME: better error detection for correct incident ID
	segments := strings.Split(request.ID, ":")
	if len(segments) != 4 || (len(segments) > 0 && segments[0] != "incident") {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("invalid incident ID: %s", request.ID)))
		return
	}

	slackInts, _ := c.Repo().SlackIntegration().ListSlackIntegrationsByProjectID(cluster.ProjectID)

	rel, err := c.Repo().Release().ReadRelease(cluster.ID, segments[1], segments[2])
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	var notifConf *types.NotificationConfig

	if rel != nil && rel.NotificationConfig != 0 {
		conf, err := c.Repo().NotificationConfig().ReadNotificationConfig(rel.NotificationConfig)

		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}

		notifConf = conf.ToNotificationConfigType()
	}

	notifier := slack.NewIncidentsNotifier(notifConf, slackInts...)

	if !cluster.NotificationsDisabled {
		err := notifier.NotifyNew(
			request, fmt.Sprintf(
				"%s/cluster-dashboard/incidents/%s?namespace=%s",
				c.Config().ServerConf.ServerURL,
				request.ID,
				segments[2],
			),
		)

		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}
	}
}
