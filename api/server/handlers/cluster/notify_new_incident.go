package cluster

import (
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/integrations/slack"
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

	request := &types.Incident{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	slackInts, _ := c.Repo().SlackIntegration().ListSlackIntegrationsByProjectID(cluster.ProjectID)

	rel, err := c.Repo().Release().ReadRelease(cluster.ID, request.ReleaseName, request.ReleaseNamespace)

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
				request.ReleaseNamespace,
			),
		)

		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}
	}
}
