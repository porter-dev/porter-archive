package notifications

import (
	"net/http"

	"connectrpc.com/connect"

	"github.com/porter-dev/porter/api/server/shared/requestutils"

	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
)

// UpdateNotificationConfigHandler is the handler for the POST /notifications/config/{notification_config_id} endpoint
type UpdateNotificationConfigHandler struct {
	handlers.PorterHandlerReadWriter
}

// NewUpdateNotificationConfigHandler returns a new UpdateNotificationConfigHandler
func NewUpdateNotificationConfigHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *UpdateNotificationConfigHandler {
	return &UpdateNotificationConfigHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

// UpdateNotificationConfigRequest is the request object for the /notifications/config/{notification_config_id} endpoint
type UpdateNotificationConfigRequest struct {
	Config             Config `json:"config"`
	SlackIntegrationID uint   `json:"slack_integration_id"`
}

// Config is the config object for the /notifications endpoint
type Config struct {
	Mention  string   `json:"mention"`
	Statuses []Status `json:"statuses"`
	Types    []Type   `json:"types"`
}

// Status is a wrapper object over a string for zod validation
type Status struct {
	Status string `json:"status"`
}

// Type is a wrapper object over a string for zod validation
type Type struct {
	Type string `json:"type"`
}

// UpdateNotificationConfigResponse is the response object for the /notifications/config/{notification_config_id} endpoint
type UpdateNotificationConfigResponse struct {
	ID uint `json:"id"`
}

// ServeHTTP updates a notification config
func (n *UpdateNotificationConfigHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-notification-config-update")
	defer span.End()

	project, _ := ctx.Value(types.ProjectScope).(*models.Project)

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "project-id", Value: project.ID},
	)

	notificationConfigID, reqErr := requestutils.GetURLParamUint(r, types.URLParamNotificationConfigID)
	if reqErr != nil {
		e := telemetry.Error(ctx, span, nil, "error parsing event id from url")
		n.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusBadRequest))
		return
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "notification-config-id", Value: notificationConfigID},
	)

	request := &UpdateNotificationConfigRequest{}
	if ok := n.DecodeAndValidate(w, r, request); !ok {
		err := telemetry.Error(ctx, span, nil, "error decoding request")
		n.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	updateReq := connect.NewRequest(&porterv1.UpdateNotificationConfigRequest{
		ProjectId:            int64(project.ID),
		NotificationConfigId: int64(notificationConfigID),
		Config:               configToProto(request.Config),
		SlackIntegrationId:   int64(request.SlackIntegrationID),
	})
	updateResp, err := n.Config().ClusterControlPlaneClient.UpdateNotificationConfig(ctx, updateReq)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error calling ccp apply porter app")
		n.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	if updateResp == nil || updateResp.Msg == nil {
		err := telemetry.Error(ctx, span, nil, "ccp response or msg is nil")
		n.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	response := &UpdateNotificationConfigResponse{
		ID: uint(updateResp.Msg.NotificationConfigId),
	}

	n.WriteResult(w, r, response)
}

func configToProto(config Config) *porterv1.NotificationConfig {
	var statuses []porterv1.EnumNotificationStatus
	for _, status := range config.Statuses {
		statuses = append(statuses, transformStatusStringToProto[status.Status])
	}

	var types []porterv1.EnumNotificationEventType
	for _, t := range config.Types {
		types = append(types, transformTypeStringToProto[t.Type])
	}

	return &porterv1.NotificationConfig{
		Statuses:    statuses,
		EventTypes:  types,
		SlackConfig: &porterv1.SlackConfig{Mentions: []string{config.Mention}},
	}
}

var transformStatusStringToProto = map[string]porterv1.EnumNotificationStatus{
	"successful":  porterv1.EnumNotificationStatus_ENUM_NOTIFICATION_STATUS_SUCCESSFUL,
	"failed":      porterv1.EnumNotificationStatus_ENUM_NOTIFICATION_STATUS_FAILED,
	"progressing": porterv1.EnumNotificationStatus_ENUM_NOTIFICATION_STATUS_PROGRESSING,
}

var transformTypeStringToProto = map[string]porterv1.EnumNotificationEventType{
	"deploy":     porterv1.EnumNotificationEventType_ENUM_NOTIFICATION_EVENT_TYPE_DEPLOY,
	"build":      porterv1.EnumNotificationEventType_ENUM_NOTIFICATION_EVENT_TYPE_BUILD,
	"pre-deploy": porterv1.EnumNotificationEventType_ENUM_NOTIFICATION_EVENT_TYPE_PREDEPLOY,
}
