package user

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type AuthCheckHandler struct {
	config *shared.Config
	writer shared.ResultWriter
}

func NewAuthCheckHandler(
	config *shared.Config,
	writer shared.ResultWriter,
) *AuthCheckHandler {
	return &AuthCheckHandler{config, writer}
}

func (a *AuthCheckHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	user, _ := r.Context().Value(types.UserScope).(*models.User)

	a.writer.WriteResult(w, user.ToUserType())
}
