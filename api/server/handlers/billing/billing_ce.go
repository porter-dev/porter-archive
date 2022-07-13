//go:build !ee
// +build !ee

package billing

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
)

type BillingWebhookHandler struct {
	handlers.PorterHandlerReader
	handlers.Unavailable
}

func NewBillingWebhookHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
) http.Handler {
	return handlers.NewUnavailable(config, "billing_webhook")
}
