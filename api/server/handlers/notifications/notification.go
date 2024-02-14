package notifications

import (
	"net/http"

	"github.com/google/uuid"

	"github.com/porter-dev/porter/internal/models"

	"github.com/porter-dev/porter/internal/porter_app/notifications"

	"github.com/porter-dev/porter/api/server/shared/requestutils"

	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/telemetry"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
)

// GetNotificationHandler is the handler for the POST /notifications/{notification_config_id} endpoint
type GetNotificationHandler struct {
	handlers.PorterHandlerReadWriter
}

// NewNotificationHandler returns a new GetNotificationHandler
func NewNotificationHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *GetNotificationHandler {
	return &GetNotificationHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

// GetNotificationRequest is the request object for the /notifications/{notification_id} endpoint
type GetNotificationRequest struct{}

// NotificationResponse is the response object for the notifications endpoint
type NotificationResponse struct {
	// Notifications are the notifications associated with the app revision
	Notification notifications.Notification `json:"notification"`
}

// ServeHTTP returns a notification by id
func (n *GetNotificationHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-notification")
	defer span.End()

	project, _ := ctx.Value(types.ProjectScope).(*models.Project)

	notificationID, reqErr := requestutils.GetURLParamString(r, types.URLParamNotificationID)
	if reqErr != nil {
		e := telemetry.Error(ctx, span, nil, "error parsing notification id from url")
		n.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusBadRequest))
		return
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "notification-id", Value: notificationID},
	)

	request := &GetNotificationRequest{}
	if ok := n.DecodeAndValidate(w, r, request); !ok {
		err := telemetry.Error(ctx, span, nil, "error decoding request")
		n.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	event, err := n.Repo().PorterAppEvent().NotificationByID(ctx, notificationID)
	if err != nil {
		e := telemetry.Error(ctx, span, nil, "error getting notification by id")
		n.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusBadRequest))
		return
	}

	// check project scope indirectly with deployment target
	deploymentTarget, err := n.Repo().DeploymentTarget().DeploymentTarget(project.ID, event.DeploymentTargetID.String())
	if err != nil || deploymentTarget == nil || deploymentTarget.ID == uuid.Nil {
		e := telemetry.Error(ctx, span, err, "notification is not in project scope")
		n.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusBadRequest))
		return
	}

	notification, err := notifications.NotificationFromPorterAppEvent(event)
	if err != nil {
		e := telemetry.Error(ctx, span, nil, "error converting app event to notification")
		n.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusInternalServerError))
		return
	}

	resp := &NotificationResponse{
		Notification: *notification,
	}

	n.WriteResult(w, r, resp)
}
