// +build !ee

package credentials

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
)

type GetCredentialsHandler struct {
	handlers.PorterHandlerReader
	handlers.Unavailable
}

func NewGetCredentialsHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) http.Handler {
	return handlers.NewUnavailable(config, "invite_update_role")
}
