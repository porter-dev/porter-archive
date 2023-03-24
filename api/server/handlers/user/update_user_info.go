package user

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type UpdateUserInfoHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewUpdateUserInfoHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *UpdateUserInfoHandler {
	return &UpdateUserInfoHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (v *UpdateUserInfoHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	user, _ := r.Context().Value(types.UserScope).(*models.User)

	request := &types.UpdateUserInfoRequest{}
	if ok := v.DecodeAndValidate(w, r, request); !ok {
		return
	}

	if request.FirstName != "" && request.LastName != "" && request.CompanyName != "" {
		user.FirstName = request.FirstName
		user.LastName = request.LastName
		user.CompanyName = request.CompanyName
	}

	user, err := v.Repo().User().UpdateUser(user)
	if err != nil {
		v.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	v.WriteResult(w, r, user.ToUserType())
}
