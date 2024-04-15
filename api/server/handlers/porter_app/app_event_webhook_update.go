package porter_app

import (
	"errors"
	"net/http"

	"connectrpc.com/connect"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/telemetry"
)

// UpdateAppEventWebhookHandler is the handler for updating app event webhooks
type UpdateAppEventWebhookHandler struct {
	handlers.PorterHandlerReadWriter
}

// NewAppEventWebhooksHandler returns a AppEventWebhooksHandler
func NewUpdateAppEventWebhookHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *UpdateAppEventWebhookHandler {
	return &UpdateAppEventWebhookHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

// UpdateAppEventWebhookRequest is the request payload for the UpdateAppEventWebhookHandler
type UpdateAppEventWebhookRequest struct {
	AppEventWebhooks []AppEventWebhook `json:"app_event_webhooks"`
}

// UpdateAppEventWebhook holds details for a single app event webhook
type UpdateAppEventResponse struct{}

// ServeHTTP handles the app event webhook update request
func (a *UpdateAppEventWebhookHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-update-app-event-webhook")
	defer span.End()

	projectID, reqErr := requestutils.GetURLParamUint(r, types.URLParamProjectID)
	if reqErr != nil {
		e := telemetry.Error(ctx, span, reqErr, "error retrieving project id")
		a.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusBadRequest))
		return
	}
	deploymentTargetID, reqErr := requestutils.GetURLParamString(r, types.URLParamDeploymentTargetIdentifier)
	if reqErr != nil {
		e := telemetry.Error(ctx, span, reqErr, "error retrieving deployment target id")
		a.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusBadRequest))
		return
	}
	appName, reqErr := requestutils.GetURLParamString(r, types.URLParamPorterAppName)
	if reqErr != nil {
		e := telemetry.Error(ctx, span, reqErr, "error retrieving app name")
		a.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusBadRequest))
		return
	}
	telemetry.WithAttributes(
		span,
		telemetry.AttributeKV{Key: "project-id", Value: projectID},
		telemetry.AttributeKV{Key: "deployment-target-id", Value: deploymentTargetID},
		telemetry.AttributeKV{Key: "app-name", Value: appName},
	)

	ccpReq := connect.NewRequest(&porterv1.UpdateAppEventWebhooksRequest{
		ProjectId: int64(projectID),
		DeploymentTargetIdentifier: &porterv1.DeploymentTargetIdentifier{
			Id: deploymentTargetID,
		},
		AppName:          appName,
		AppEventWebhooks: []*porterv1.AppEventWebhook{},
	})
	req := UpdateAppEventWebhookRequest{}
	if !a.DecodeAndValidate(w, r, &req) {
		e := telemetry.Error(ctx, span, nil, "error decoding request")
		a.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusBadRequest))
		return
	}
	for _, appEventWebhook := range req.AppEventWebhooks {
		appEventTypeEnum, err := toWebhookAppEventTypeEnum(appEventWebhook.AppEventType)
		if err != nil {
			e := telemetry.Error(ctx, span, err, "invalid app event type")
			a.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusBadRequest))
			return
		}
		appEventStatusEnum, err := toWebhookAppEventStatusEnum(appEventWebhook.AppEventStatus)
		if err != nil {
			e := telemetry.Error(ctx, span, err, "invalid app event status")
			a.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusBadRequest))
			return
		}
		ccpReq.Msg.AppEventWebhooks = append(ccpReq.Msg.AppEventWebhooks, &porterv1.AppEventWebhook{
			WebhookUrl:           appEventWebhook.WebhookURL,
			AppEventType:         appEventTypeEnum,
			AppEventStatus:       appEventStatusEnum,
			PayloadEncryptionKey: appEventWebhook.PayloadEncryptionKey,
		})
	}
	_, err := a.Config().ClusterControlPlaneClient.UpdateAppEventWebhooks(ctx, ccpReq)
	if err != nil {
		e := telemetry.Error(ctx, span, err, "ccp error while updating AppEventWebhook")
		a.HandleAPIError(w, r, apierrors.NewErrInternal(e))
		return
	}
	a.WriteResult(w, r, UpdateAppEventResponse{})
}

func toWebhookAppEventTypeEnum(appEventType string) (porterv1.WebhookAppEventType, error) {
	switch appEventType {
	case "deploy":
		return porterv1.WebhookAppEventType_WEBHOOK_APP_EVENT_TYPE_DEPLOY, nil
	case "build":
		return porterv1.WebhookAppEventType_WEBHOOK_APP_EVENT_TYPE_BUILD, nil
	case "predeploy":
		return porterv1.WebhookAppEventType_WEBHOOK_APP_EVENT_TYPE_PREDEPLOY, nil
	default:
		return porterv1.WebhookAppEventType_WEBHOOK_APP_EVENT_TYPE_UNSPECIFIED, errors.New("unsupported app event type")
	}
}

func toAppEventType(appEventWebhookEnum porterv1.WebhookAppEventType) (string, error) {
	switch appEventWebhookEnum {
	case porterv1.WebhookAppEventType_WEBHOOK_APP_EVENT_TYPE_DEPLOY:
		return "deploy", nil
	case porterv1.WebhookAppEventType_WEBHOOK_APP_EVENT_TYPE_BUILD:
		return "build", nil
	case porterv1.WebhookAppEventType_WEBHOOK_APP_EVENT_TYPE_PREDEPLOY:
		return "predeploy", nil
	default:
		return "", errors.New("unsupported app event type")
	}
}

func toWebhookAppEventStatusEnum(appEventStatus string) (porterv1.WebhookAppEventStatus, error) {
	switch appEventStatus {
	case "success":
		return porterv1.WebhookAppEventStatus_WEBHOOK_APP_EVENT_STATUS_SUCCESS, nil
	case "failed":
		return porterv1.WebhookAppEventStatus_WEBHOOK_APP_EVENT_STATUS_FAILED, nil
	case "canceled":
		return porterv1.WebhookAppEventStatus_WEBHOOK_APP_EVENT_STATUS_CANCELED, nil
	default:
		return porterv1.WebhookAppEventStatus_WEBHOOK_APP_EVENT_STATUS_UNSPECIFIED, nil
	}
}

func toAppEventStatus(appEventStatusEnum porterv1.WebhookAppEventStatus) (string, error) {
	switch appEventStatusEnum {
	case porterv1.WebhookAppEventStatus_WEBHOOK_APP_EVENT_STATUS_SUCCESS:
		return "success", nil
	case porterv1.WebhookAppEventStatus_WEBHOOK_APP_EVENT_STATUS_FAILED:
		return "failed", nil
	case porterv1.WebhookAppEventStatus_WEBHOOK_APP_EVENT_STATUS_CANCELED:
		return "canceled", nil
	default:
		return "", nil
	}
}
