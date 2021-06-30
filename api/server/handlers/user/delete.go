package user

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/authn"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type UserDeleteHandler struct {
	config *shared.Config
	writer shared.ResultWriter
}

func NewUserDeleteHandler(
	config *shared.Config,
	writer shared.ResultWriter,
) *UserDeleteHandler {
	return &UserDeleteHandler{config, writer}
}

func (u *UserDeleteHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	user, _ := r.Context().Value(types.UserScope).(*models.User)

	user, err := u.config.Repo.User().DeleteUser(user)

	if err != nil {
		apierrors.HandleAPIError(w, u.config.Logger, apierrors.NewErrInternal(err))
		return
	}

	// set the user as unauthenticated in the session
	if err := authn.SaveUserUnauthenticated(w, r, u.config); err != nil {
		apierrors.HandleAPIError(w, u.config.Logger, apierrors.NewErrInternal(err))
		return
	}

	u.writer.WriteResult(w, user.ToUserType())
}
