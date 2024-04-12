package porter_app

// import (
// 	"net/http"

// 	"connectrpc.com/connect"
// 	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
// 	"github.com/porter-dev/porter/api/server/handlers"
// 	"github.com/porter-dev/porter/api/server/shared"
// 	"github.com/porter-dev/porter/api/server/shared/config"
// 	"github.com/porter-dev/porter/api/types"
// 	"github.com/porter-dev/porter/internal/models"
// 	"github.com/porter-dev/porter/internal/telemetry"
// )

// type AppEventWebhookPayloadEncryptionKey struct {
// 	handlers.PorterHandlerReadWriter
// }

// func NewAppEventWebhookPayloadEncryptionKey(
// 	config *config.Config,
// 	decoderValidator shared.RequestDecoderValidator,
// 	writer shared.ResultWriter,
// ) *AppEventWebhookPayloadEncryptionKey {
// 	return &AppEventWebhookPayloadEncryptionKey{
// 		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
// 	}
// }

// type DeleteAppEventWebhookRequest struct {
// 	ID string `json:"id"`
// }

// func (a *AppEventWebhookPayloadEncryptionKey) ServeHTTP(w http.ResponseWriter, r *http.Request) {
// 	ctx, span := telemetry.NewSpan(r.Context(), "serve-app-webhook-")
// 	defer span.End()

// 	project, _ := ctx.Value(types.ProjectScope).(*models.Project)
// 	ccpReq := connect.NewRequest(&porterv1.DeleteAppEventWebhookRequest{})
// 	resp, err := a.Config().ClusterControlPlaneClient.DeleteAppDeployment()
// }
