// +build !ee

package invite

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
)

type InviteUpdateRoleHandler struct {
	handlers.PorterHandlerReader
	handlers.Unavailable
}

func NewInviteUpdateRoleHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
) http.Handler {
	return handlers.NewUnavailable(config, "invite_update_role")
}

type InviteAcceptHandler struct {
	handlers.PorterHandler
}

func NewInviteAcceptHandler(
	config *config.Config,
) http.Handler {
	return handlers.NewUnavailable(config, "invite_accept")
}

type InviteCreateHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewInviteCreateHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) http.Handler {
	return handlers.NewUnavailable(config, "invite_create")
}

type InviteDeleteHandler struct {
	handlers.PorterHandler
	authz.KubernetesAgentGetter
}

func NewInviteDeleteHandler(
	config *config.Config,
) http.Handler {
	return handlers.NewUnavailable(config, "invite_delete")
}

type InvitesListHandler struct {
	handlers.PorterHandlerWriter
}

func NewInvitesListHandler(
	config *config.Config,
	writer shared.ResultWriter,
) http.Handler {
	return handlers.NewUnavailable(config, "invite_list")
}
