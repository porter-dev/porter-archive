package porter_app

import (
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

// AppEventWebhooksHandler is the handler for fetching app event webhooks
type AppEventWebhooksHandler struct {
	handlers.PorterHandlerReadWriter
}

// NewAppEventWebhooksHandler returns a AppEventWebhooksHandler
func NewAppEventWebhooksHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *AppEventWebhooksHandler {
	return &AppEventWebhooksHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

// AppEventWebhooksResposne is the response payload for the AppEventWebhooksHandler
type AppEventWebhooksResponse struct {
	AppEventWebhooks []AppEventWebhook `json:"app_event_webhooks"`
}

// AppEventWebhook holds details for a single app event webhook
type AppEventWebhook struct {
	WebhookURL           string `json:"url"`
	AppEventType         string `json:"app_event_type"`
	AppEventStatus       string `json:"app_event_status"`
	PayloadEncryptionKey string `json:"payload_encryption_key"`
}

// ServeHTTP handles the app event webhook fetch request
func (a *AppEventWebhooksHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-app-event-webhooks")
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

	ccpReq := connect.NewRequest(&porterv1.AppEventWebhooksRequest{
		ProjectId: int64(projectID),
		DeploymentTargetIdentifier: &porterv1.DeploymentTargetIdentifier{
			Id: deploymentTargetID,
		},
		AppName: appName,
	})
	ccpResp, err := a.Config().ClusterControlPlaneClient.AppEventWebhooks(ctx, ccpReq)
	if err != nil {
		e := telemetry.Error(ctx, span, err, "ccp error while listing AppEventWebhooks")
		a.HandleAPIError(w, r, apierrors.NewErrInternal(e))
		return
	}
	resp := AppEventWebhooksResponse{}
	if ccpResp.Msg == nil || ccpResp.Msg.AppEventWebhooks == nil {
		a.WriteResult(w, r, resp)
		return
	}
	for _, appEventWebhook := range ccpResp.Msg.AppEventWebhooks {
		appEventType, err := toAppEventType(appEventWebhook.AppEventType)
		if err != nil {
			e := telemetry.Error(ctx, span, err, "error processing AppEventWebhook from ccp")
			a.HandleAPIError(w, r, apierrors.NewErrInternal(e))
			return
		}
		appEventStatus, err := toAppEventStatus(appEventWebhook.AppEventStatus)
		if err != nil {
			e := telemetry.Error(ctx, span, err, "error processing AppEventWebhook from ccp")
			a.HandleAPIError(w, r, apierrors.NewErrInternal(e))
			return
		}
		resp.AppEventWebhooks = append(resp.AppEventWebhooks, AppEventWebhook{
			WebhookURL:           string(appEventWebhook.WebhookUrl),
			AppEventType:         appEventType,
			AppEventStatus:       appEventStatus,
			PayloadEncryptionKey: string(appEventWebhook.PayloadEncryptionKey),
		})
	}
	a.WriteResult(w, r, resp)
}
