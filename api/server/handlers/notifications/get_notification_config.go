package notifications

import (
	"encoding/json"
	"fmt"
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

// GetNotificationConfigHandler is the handler for the POST /notifications/config/{notification_config_id} endpoint
type GetNotificationConfigHandler struct {
	handlers.PorterHandlerReadWriter
}

// NewNotificationConfigHandler returns a new GetNotificationConfigHandler
func NewNotificationConfigHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *GetNotificationConfigHandler {
	return &GetNotificationConfigHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

// GetNotificationConfigRequest is the request object for the /notifications/config/{notification_config_id} endpoint
type GetNotificationConfigRequest struct{}

// GetNotificationConfigResponse is the response object for the /notifications/config/{notification_config_id} endpoint
type GetNotificationConfigResponse struct {
	Config Config `json:"config"`
}

// ServeHTTP updates a notification config
func (n *GetNotificationConfigHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-notification-config")
	defer span.End()

	project, _ := ctx.Value(types.ProjectScope).(*models.Project)

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

	config, err := configFromProto(ccpResp.Msg.Config)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error getting config from proto")
		n.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	response := &GetNotificationConfigResponse{
		Config: config,
	}

	n.WriteResult(w, r, response)
}

func configFromProto(proto *porterv1.NotificationConfig) (Config, error) {
	// initializing the map to true for all statuses and types
	// ensures that the default behavior is to notify for missing statuses and types
	statuses := trueMap(allStatuses)
	types := trueMap(allTypes)

	for _, protoStatus := range proto.EnabledStatuses {
		if status, ok := transformProtoToStatusString[protoStatus.Status]; ok {
			statuses[status] = protoStatus.Enabled
		}
	}
	for _, protoType := range proto.EnabledTypes {
		if t, ok := transformProtoToTypeString[protoType.Type]; ok {
			types[t] = protoType.Enabled
		}
	}

	statusesStruct := StatusesEnabled{}
	by, err := json.Marshal(statuses)
	if err != nil {
		return Config{}, fmt.Errorf("error marshalling statuses: %s", err)
	}
	err = json.Unmarshal(by, &statusesStruct)
	if err != nil {
		return Config{}, fmt.Errorf("error unmarshalling statuses: %s", err)
	}

	typesStruct := TypesEnabled{}
	by, err = json.Marshal(types)
	if err != nil {
		return Config{}, fmt.Errorf("error marshalling types: %s", err)
	}
	err = json.Unmarshal(by, &typesStruct)
	if err != nil {
		return Config{}, fmt.Errorf("error unmarshalling types: %s", err)
	}

	var mention string
	if proto.SlackConfig != nil && len(proto.SlackConfig.Mentions) > 0 {
		mention = proto.SlackConfig.Mentions[0]
	}

	config := Config{
		Statuses: statusesStruct,
		Mention:  mention,
		Types:    typesStruct,
	}

	return config, nil
}
