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

// GetNotificationConfigHandler is the handler for the POST /notifications/{notification_config_id} endpoint
type GetNotificationConfigHandler struct {
	handlers.PorterHandlerReadWriter
}

// NewGetNotificationConfigHandler returns a new GetNotificationConfigHandler
func NewGetNotificationConfigHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *GetNotificationConfigHandler {
	return &GetNotificationConfigHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

// GetNotificationConfigRequest is the request object for the /notifications/{notification_config_id} endpoint
type GetNotificationConfigRequest struct{}

// GetNotificationConfigResponse is the response object for the /notifications/{notification_config_id} endpoint
type GetNotificationConfigResponse struct {
	Config Config `json:"config"`
}

// ServeHTTP updates a notification config
func (n *GetNotificationConfigHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-notification-config")
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

	request := &GetNotificationConfigRequest{}
	if ok := n.DecodeAndValidate(w, r, request); !ok {
		err := telemetry.Error(ctx, span, nil, "error decoding request")
		n.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	configReq := connect.NewRequest(&porterv1.NotificationConfigRequest{
		ProjectId:            int64(project.ID),
		NotificationConfigId: int64(notificationConfigID),
	})
	ccpResp, err := n.Config().ClusterControlPlaneClient.NotificationConfig(ctx, configReq)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error calling ccp apply porter app")
		n.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	if ccpResp == nil || ccpResp.Msg == nil {
		err := telemetry.Error(ctx, span, nil, "ccp response or msg is nil")
		n.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	response := &GetNotificationConfigResponse{
		Config: configFromProto(ccpResp.Msg.Config),
	}

	n.WriteResult(w, r, response)
}

func configFromProto(proto *porterv1.NotificationConfig) Config {
	if proto == nil {
		return Config{}
	}

	var statuses []Status
	for _, status := range proto.Statuses {
		statuses = append(statuses, Status{transformProtoToStatusString[status]})
	}

	var mention string
	if proto.SlackConfig != nil && len(proto.SlackConfig.Mentions) > 0 {
		mention = proto.SlackConfig.Mentions[0]
	}

	return Config{
		Statuses: statuses,
		Mention:  mention,
	}
}

var transformProtoToStatusString = map[porterv1.EnumNotificationStatus]string{
	porterv1.EnumNotificationStatus_ENUM_NOTIFICATION_STATUS_SUCCESSFUL:  "successful",
	porterv1.EnumNotificationStatus_ENUM_NOTIFICATION_STATUS_FAILED:      "failed",
	porterv1.EnumNotificationStatus_ENUM_NOTIFICATION_STATUS_PROGRESSING: "progressing",
}
