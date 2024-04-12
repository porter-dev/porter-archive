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

type AddAppEventWebhookHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewAddAppEventWebhookHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *AddAppEventWebhookHandler {
	return &AddAppEventWebhookHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

type AddAppEventWebhookRequest struct {
	WebhookURL     string `json:"webhook_url"`
	AppEventType   string `json:"app_event_type"`
	AppEventStatus string `json:"app_event_status"`
}

type AddAppEventWebhookResponse struct {
	ID                   string `json:"id"`
	PayloadEncryptionKey string `json:"payload_encryption_key"`
}

func (a *AddAppEventWebhookHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-add-app-event-webhook")
	defer span.End()

	// project, _ := ctx.Value(types.ProjectScope).(*models.Project)
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
		telemetry.AttributeKV{Key: "project-id", Value: 10},
		telemetry.AttributeKV{Key: "deployment-target-id", Value: deploymentTargetID},
		telemetry.AttributeKV{Key: "appp-name", Value: appName},
	)

	req := AddAppEventWebhookRequest{}
	if !a.DecodeAndValidate(w, r, &req) {
		e := telemetry.Error(ctx, span, nil, "error decoding request")
		a.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusBadRequest))
		return
	}
	telemetry.WithAttributes(
		span,
		telemetry.AttributeKV{Key: "app-event-type", Value: req.AppEventType},
		telemetry.AttributeKV{Key: "app-event-status", Value: req.AppEventStatus},
	)
	appEventTypeEnum, err := toWebhookAppEventTypeEnum(req.AppEventType)
	if err != nil {
		e := telemetry.Error(ctx, span, err, "invalid app event type")
		a.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusBadRequest))
		return
	}
	appEventStatusEnum, err := toWebhookAppEventStatusEnum(req.AppEventStatus)
	if err != nil {
		e := telemetry.Error(ctx, span, err, "invalid app event status")
		a.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusBadRequest))
		return
	}
	ccpReq := connect.NewRequest(&porterv1.AddAppEventWebhookRequest{
		ProjectId: int64(10),
		DeploymentTargetIdentifier: &porterv1.DeploymentTargetIdentifier{
			Id: deploymentTargetID,
		},
		AppName: appName,
		AppEventWebhook: &porterv1.AppEventWebhook{
			WebhookUrl:     []byte(req.WebhookURL),
			AppEventType:   appEventTypeEnum,
			AppEventStatus: appEventStatusEnum,
		},
	})
	resp, err := a.Config().ClusterControlPlaneClient.AddAppEventWebhook(ctx, ccpReq)
	if err != nil {
		e := telemetry.Error(ctx, span, err, "ccp error while adding AppEventWebhook")
		a.HandleAPIError(w, r, apierrors.NewErrInternal(e))
		return
	}
	a.WriteResult(w, r, AddAppEventWebhookResponse{
		ID:                   resp.Msg.Id,
		PayloadEncryptionKey: string(resp.Msg.PayloadEncryptionKey),
	})
}

func toWebhookAppEventTypeEnum(appEventType string) (porterv1.WebhookAppEventType, error) {
	switch appEventType {
	case "deploy":
		return porterv1.WebhookAppEventType_WEBHOOK_APP_EVENT_TYPE_DEPLOY, nil
	case "build":
		return porterv1.WebhookAppEventType_WEBHOOK_APP_EVENT_TYPE_BUILD, nil
	case "inittial_deploy":
		return porterv1.WebhookAppEventType_WEBHOOK_APP_EVENT_TYPE_INIT_DEPLOY, nil
	case "predeploy":
		return porterv1.WebhookAppEventType_WEBHOOK_APP_EVENT_TYPE_PREDEPLOY, nil
	default:
		return porterv1.WebhookAppEventType_WEBHOOK_APP_EVENT_TYPE_UNSPECIFIED, errors.New("unsupported app event type")
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
	case "progressing":
		return porterv1.WebhookAppEventStatus_WEBHOOK_APP_EVENT_STATUS_PROGRESSING, nil
	default:
		return porterv1.WebhookAppEventStatus_WEBHOOK_APP_EVENT_STATUS_UNSPECIFIED, nil
	}
}
