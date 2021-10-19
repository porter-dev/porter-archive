// +build ee

package credentials

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/ee/api/server/handlers/credentials"
)

var NewGetCredentialsHandler func(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) http.Handler

func init() {
	NewGetCredentialsHandler = credentials.NewCredentialsGetHandler
}
