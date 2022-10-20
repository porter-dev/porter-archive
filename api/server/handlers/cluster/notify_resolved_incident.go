package cluster

import (
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/notifier"
	"github.com/porter-dev/porter/internal/notifier/sendgrid"
	"github.com/porter-dev/porter/internal/notifier/slack"
	"gorm.io/gorm"
)

type NotifyResolvedIncidentHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewNotifyResolvedIncidentHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *NotifyResolvedIncidentHandler {
	return &NotifyResolvedIncidentHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *NotifyResolvedIncidentHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	request := &types.Incident{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	slackInts, _ := c.Repo().SlackIntegration().ListSlackIntegrationsByProjectID(cluster.ProjectID)

	rel, err := c.Repo().Release().ReadRelease(cluster.ID, request.ReleaseName, request.ReleaseNamespace)

	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
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

	notifiers := make([]notifier.IncidentNotifier, 0)

	if c.Config().SlackConf != nil {
		notifiers = append(notifiers, slack.NewIncidentNotifier(slackInts...))
	}

	if sc := c.Config().ServerConf; sc.SendgridAPIKey != "" && sc.SendgridSenderEmail != "" && sc.SendgridIncidentAlertTemplateID != "" {
		users, err := getUsersByProjectID(c.Repo(), cluster.ProjectID)

		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}

		notifiers = append(notifiers, sendgrid.NewIncidentNotifier(&sendgrid.IncidentNotifierOpts{
			SharedOpts: &sendgrid.SharedOpts{
				APIKey:      c.Config().ServerConf.SendgridAPIKey,
				SenderEmail: c.Config().ServerConf.SendgridSenderEmail,
			},
			IncidentResolvedTemplateID: sc.SendgridIncidentResolvedTemplateID,
			Users:                      users,
		}))
	}

	multi := notifier.NewMultiIncidentNotifier(
		notifConf,
		notifiers...,
	)

	if !cluster.NotificationsDisabled {
		url := fmt.Sprintf(
			"%s/applications/%s/%s/%s?project_id=%d",
			c.Config().ServerConf.ServerURL,
			cluster.Name,
			request.ReleaseNamespace,
			request.ReleaseName,
			cluster.ProjectID,
		)

		if strings.ToLower(string(request.InvolvedObjectKind)) == "job" {
			url = fmt.Sprintf(
				"%s/jobs/%s/%s/%s?project_id=%d&job=%s",
				c.Config().ServerConf.ServerURL,
				cluster.Name,
				request.ReleaseNamespace,
				request.ReleaseName,
				cluster.ProjectID,
				request.InvolvedObjectName,
			)
		}

		err := multi.NotifyResolved(request, url)

		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}
	}
}
