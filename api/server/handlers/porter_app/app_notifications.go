package porter_app

import (
	"context"
	"net/http"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/shared/requestutils"

	"connectrpc.com/connect"

	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"

	"github.com/google/uuid"

	"github.com/porter-dev/porter/internal/porter_app"
	"github.com/porter-dev/porter/internal/porter_app/notifications"
	"github.com/porter-dev/porter/internal/repository"
	"github.com/porter-dev/porter/internal/telemetry"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

// AppNotificationsHandler handles requests to the /apps/{porter_app_name}/notifications endpoint
type AppNotificationsHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

// NewAppNotificationsHandler returns a new AppNotificationsHandler
func NewAppNotificationsHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *AppNotificationsHandler {
	return &AppNotificationsHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

// AppNotificationsRequest is the request object for the /apps/{porter_app_name}/notifications endpoint
type AppNotificationsRequest struct {
	DeploymentTargetID string `schema:"deployment_target_id"`
}

// AppNotificationsResponse is the response object for the /apps/{porter_app_name}/notifications endpoint
type AppNotificationsResponse struct {
	// Notifications are the notifications associated with the app revision
	Notifications []notifications.Notification `json:"notifications"`
}

func (c *AppNotificationsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-app-notifications")
	defer span.End()

	project, _ := ctx.Value(types.ProjectScope).(*models.Project)

	appName, reqErr := requestutils.GetURLParamString(r, types.URLParamPorterAppName)
	if reqErr != nil {
		e := telemetry.Error(ctx, span, reqErr, "error parsing stack name from url")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusBadRequest))
		return
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "app-name", Value: appName})

	request := &AppNotificationsRequest{}
	if ok := c.DecodeAndValidate(w, r, request); !ok {
		err := telemetry.Error(ctx, span, nil, "error decoding request")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	_, err := uuid.Parse(request.DeploymentTargetID)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error parsing deployment target id")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "deployment-target-id", Value: request.DeploymentTargetID})

	porterApps, err := c.Repo().PorterApp().ReadPorterAppsByProjectIDAndName(project.ID, appName)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error getting porter apps")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	if len(porterApps) == 0 {
		err := telemetry.Error(ctx, span, err, "no porter apps returned")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	if len(porterApps) > 1 {
		err := telemetry.Error(ctx, span, err, "multiple porter apps returned; unable to determine which one to use")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	appId := porterApps[0].ID
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "app-id", Value: appId})

	if appId == 0 {
		err := telemetry.Error(ctx, span, err, "porter app id is missing")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	listAppRevisionsReq := connect.NewRequest(&porterv1.ListAppRevisionsRequest{
		ProjectId:                  int64(project.ID),
		AppId:                      int64(appId),
		DeploymentTargetIdentifier: &porterv1.DeploymentTargetIdentifier{Id: request.DeploymentTargetID},
	})

	listAppRevisionsResp, err := c.Config().ClusterControlPlaneClient.ListAppRevisions(ctx, listAppRevisionsReq)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error listing app revisions")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	if listAppRevisionsResp == nil || listAppRevisionsResp.Msg == nil {
		err = telemetry.Error(ctx, span, nil, "list app revisions response is nil")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	appRevisionsList := listAppRevisionsResp.Msg.AppRevisions

	latestNotifications := make([]notifications.Notification, 0)
	encodedRevisions := make([]porter_app.Revision, 0)

	if len(appRevisionsList) > 0 {
		encodedRevision, err := porter_app.EncodedRevisionFromProto(ctx, appRevisionsList[0])
		if err != nil {
			err := telemetry.Error(ctx, span, err, "error getting encoded revision from proto")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}
		encodedRevisions = append(encodedRevisions, encodedRevision)

		// encode the penultimate revision as well in case it is a rollback
		if len(appRevisionsList) > 1 {
			penultimateRevision, err := porter_app.EncodedRevisionFromProto(ctx, appRevisionsList[1])
			if err != nil {
				err := telemetry.Error(ctx, span, err, "error getting encoded revision from proto")
				c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
				return
			}
			encodedRevisions = append(encodedRevisions, penultimateRevision)
		}
	}

	if len(encodedRevisions) > 0 {
		latestNotifications, err = notificationsForRevision(ctx, notificationsForRevisionInput{
			Revision:                 encodedRevisions[0],
			PorterAppEventRepository: c.Repo().PorterAppEvent(),
		})
		if err != nil {
			err := telemetry.Error(ctx, span, err, "error getting notifications for revision")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}

		// if the penultimate revision is a rollback, get the notifications for that revision as well so we can show the user why the rollback happened
		if len(encodedRevisions) > 1 && encodedRevisions[1].Status == models.AppRevisionStatus_RollbackSuccessful {
			rollbackNotifications, err := notificationsForRevision(ctx, notificationsForRevisionInput{
				Revision:                 encodedRevisions[1],
				PorterAppEventRepository: c.Repo().PorterAppEvent(),
			})
			if err != nil {
				err := telemetry.Error(ctx, span, err, "error getting notifications for rollback revision")
				c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
				return
			}
			latestNotifications = append(latestNotifications, rollbackNotifications...)
		}
	}

	response := AppNotificationsResponse{
		Notifications: latestNotifications,
	}

	c.WriteResult(w, r, response)
}

type notificationsForRevisionInput struct {
	Revision                 porter_app.Revision
	PorterAppEventRepository repository.PorterAppEventRepository
}

func notificationsForRevision(ctx context.Context, inp notificationsForRevisionInput) ([]notifications.Notification, error) {
	ctx, span := telemetry.NewSpan(ctx, "notifications-for-revision")
	defer span.End()

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "app-revision-id", Value: inp.Revision.ID},
		telemetry.AttributeKV{Key: "app-instance-id", Value: inp.Revision.AppInstanceID},
	)

	notificationList := make([]notifications.Notification, 0)

	if inp.Revision.ID == "" {
		return notificationList, telemetry.Error(ctx, span, nil, "app revision id is missing")
	}

	if inp.Revision.AppInstanceID == uuid.Nil {
		return notificationList, telemetry.Error(ctx, span, nil, "app instance id is missing")
	}

	appRevisionId := inp.Revision.ID
	appInstanceId := inp.Revision.AppInstanceID

	notificationEvents, err := inp.PorterAppEventRepository.ReadNotificationsByAppRevisionID(ctx, appInstanceId, appRevisionId)
	if err != nil {
		return notificationList, telemetry.Error(ctx, span, err, "error getting notifications from repo")
	}
	for _, event := range notificationEvents {
		notification, err := notifications.NotificationFromPorterAppEvent(event)
		if err != nil {
			telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "notification-conversion-error", Value: err.Error()})
			continue
		}
		if notification == nil {
			telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "notification-conversion-error", Value: "notification is nil"})
			continue
		}
		// TODO: remove this check once this attribute is not found in the span for >30 days
		if notification.Scope == "" {
			telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "notification-conversion-error", Value: "old-notification-format"})
			continue
		}
		notificationList = append(notificationList, *notification)
	}

	return notificationList, nil
}
