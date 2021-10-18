// +build ee

package invite

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"

	"github.com/porter-dev/porter/ee/api/server/handlers/invite"
)

var NewInviteUpdateRoleHandler func(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
) http.Handler

var NewInviteAcceptHandler func(
	config *config.Config,
) http.Handler

var NewInviteCreateHandler func(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) http.Handler

var NewInviteDeleteHandler func(
	config *config.Config,
) http.Handler

var NewInvitesListHandler func(
	config *config.Config,
	writer shared.ResultWriter,
) http.Handler

func init() {
	NewInviteUpdateRoleHandler = invite.NewInviteUpdateRoleHandler
	NewInviteAcceptHandler = invite.NewInviteAcceptHandler
	NewInviteCreateHandler = invite.NewInviteCreateHandler
	NewInviteDeleteHandler = invite.NewInviteDeleteHandler
	NewInvitesListHandler = invite.NewInvitesListHandler
}
