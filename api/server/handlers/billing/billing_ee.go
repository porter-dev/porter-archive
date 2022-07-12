//go:build ee
// +build ee

package billing

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"

	"github.com/porter-dev/porter/ee/api/server/handlers/billing"
)

var NewBillingWebhookHandler func(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
) http.Handler

func init() {
	NewBillingWebhookHandler = billing.NewBillingWebhookHandler
}
