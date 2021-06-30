package user

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/authn"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
)

type UserLogoutHandler struct {
	config *shared.Config
}

func NewUserLogoutHandler(
	config *shared.Config,
) *UserLogoutHandler {
	return &UserLogoutHandler{config}
}

func (u *UserLogoutHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if err := authn.SaveUserUnauthenticated(w, r, u.config); err != nil {
		apierrors.HandleAPIError(w, u.config.Logger, apierrors.NewErrInternal(err))
	}

	return
}
