package user

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type UserGetCurrentHandler struct {
	handlers.PorterHandlerWriter
}

func NewUserGetCurrentHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *UserGetCurrentHandler {
	return &UserGetCurrentHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (a *UserGetCurrentHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	user, _ := r.Context().Value(types.UserScope).(*models.User)

	a.WriteResult(w, r, user.ToUserType())
}
