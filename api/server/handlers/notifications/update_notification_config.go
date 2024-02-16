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
	Mention  string          `json:"mention"`
	Statuses StatusesEnabled `json:"statuses"`
	Types    TypesEnabled    `json:"types"`
}

// StatusesEnabled is a struct that signifies whether a status is enabled or not
type StatusesEnabled struct {
	Successful  bool `json:"successful"`
	Failed      bool `json:"failed"`
	Progressing bool `json:"progressing"`
}

// TypesEnabled is a struct that signifies whether a type is enabled or not
type TypesEnabled struct {
	Deploy    bool `json:"deploy"`
	Build     bool `json:"build"`
	PreDeploy bool `json:"predeploy"`
	Alert     bool `json:"alert"`
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

	configProto, err := configToProto(request.Config)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error converting config to proto")
		n.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	updateReq := connect.NewRequest(&porterv1.UpdateNotificationConfigRequest{
		ProjectId:            int64(project.ID),
		NotificationConfigId: int64(notificationConfigID),
		Config:               configProto,
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

func configToProto(config Config) (*porterv1.NotificationConfig, error) {
	statusMap := map[string]bool{}

	by, err := json.Marshal(config.Statuses)
	if err != nil {
		return nil, fmt.Errorf("error marshalling statuses: %s", err)
	}

	err = json.Unmarshal(by, &statusMap)
	if err != nil {
		return nil, fmt.Errorf("error unmarshalling statuses: %s", err)
	}

	var statuses []*porterv1.NotificationStatusEnabled
	for status, enabled := range statusMap {
		if protoStatus, ok := transformStatusStringToProto[status]; ok {
			statuses = append(statuses, &porterv1.NotificationStatusEnabled{
				Status:  protoStatus,
				Enabled: enabled,
			})
		}
	}

	typeMap := map[string]bool{}

	by, err = json.Marshal(config.Types)
	if err != nil {
		return nil, fmt.Errorf("error marshalling types: %s", err)
	}

	err = json.Unmarshal(by, &typeMap)
	if err != nil {
		return nil, fmt.Errorf("error unmarshalling types: %s", err)
	}

	var types []*porterv1.NotificationTypeEnabled
	for t, enabled := range typeMap {
		if protoType, ok := transformTypeStringToProto[t]; ok {
			types = append(types, &porterv1.NotificationTypeEnabled{
				Type:    protoType,
				Enabled: enabled,
			})
		}
	}

	protoConfig := &porterv1.NotificationConfig{
		EnabledStatuses: statuses,
		EnabledTypes:    types,
		SlackConfig:     &porterv1.SlackConfig{Mentions: []string{config.Mention}},
	}

	return protoConfig, nil
}

var transformStatusStringToProto = map[string]porterv1.EnumNotificationStatus{
	"successful":  porterv1.EnumNotificationStatus_ENUM_NOTIFICATION_STATUS_SUCCESSFUL,
	"failed":      porterv1.EnumNotificationStatus_ENUM_NOTIFICATION_STATUS_FAILED,
	"progressing": porterv1.EnumNotificationStatus_ENUM_NOTIFICATION_STATUS_PROGRESSING,
}

var transformTypeStringToProto = map[string]porterv1.EnumNotificationEventType{
	"deploy":    porterv1.EnumNotificationEventType_ENUM_NOTIFICATION_EVENT_TYPE_DEPLOY,
	"build":     porterv1.EnumNotificationEventType_ENUM_NOTIFICATION_EVENT_TYPE_BUILD,
	"predeploy": porterv1.EnumNotificationEventType_ENUM_NOTIFICATION_EVENT_TYPE_PREDEPLOY,
	"alert":     porterv1.EnumNotificationEventType_ENUM_NOTIFICATION_EVENT_TYPE_ALERT,
}

// reverseMap returns a map with the keys and values swapped
func reverseMap[K comparable, V comparable](m map[K]V) map[V]K {
	result := map[V]K{}
	for k, v := range m {
		result[v] = k
	}
	return result
}

// mapKeys returns the keys of a map as a slice
func mapKeys[K comparable, V any](m map[K]V) []K {
	var keys []K
	for k := range m {
		keys = append(keys, k)
	}
	return keys
}

// trueMap returns a map with the keys set to true
func trueMap[K comparable](keys []K) map[K]bool {
	m := map[K]bool{}
	for _, k := range keys {
		m[k] = true
	}
	return m
}

var (
	transformProtoToStatusString = reverseMap(transformStatusStringToProto)
	transformProtoToTypeString   = reverseMap(transformTypeStringToProto)
	allStatuses                  = mapKeys(transformStatusStringToProto)
	allTypes                     = mapKeys(transformTypeStringToProto)
)
