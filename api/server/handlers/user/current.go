package user

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type UserGetCurrentHandler struct {
	config *shared.Config
	writer shared.ResultWriter
}

func NewUserGetCurrentHandler(
	config *shared.Config,
	writer shared.ResultWriter,
) *UserGetCurrentHandler {
	return &UserGetCurrentHandler{config, writer}
}

func (a *UserGetCurrentHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	user, _ := r.Context().Value(types.UserScope).(*models.User)

	a.writer.WriteResult(w, user.ToUserType())
}
