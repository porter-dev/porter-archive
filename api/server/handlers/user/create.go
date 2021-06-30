package user

import (
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
)

type UserCreateHandler struct {
	config           *shared.Config
	decoderValidator shared.RequestDecoderValidator
	writer           shared.ResultWriter
}

func NewUserCreateHandler(
	config *shared.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *UserCreateHandler {
	return &UserCreateHandler{config, decoderValidator, writer}
}

func (u *UserCreateHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	request := &types.CreateUserRequest{}

	ok := u.decoderValidator.DecodeAndValidate(w, r, request)

	if !ok {
		return
	}

	user := &models.User{
		Email:    request.Email,
		Password: request.Password,
	}

	// check if user exists
	doesExist := doesUserExist(u.config.Repo, user)

	if doesExist {
		apierrors.HandleAPIError(
			w,
			u.config.Logger,
			apierrors.NewErrPassThroughToClient(
				fmt.Errorf("email already taken"),
				http.StatusBadRequest,
			),
		)
		return
	}

	// write the user to the db
	user, err := u.config.Repo.User().CreateUser(user)

	if err != nil {
		apierrors.HandleAPIError(w, u.config.Logger, apierrors.NewErrInternal(err))
		return
	}

	session, err := u.config.Store.Get(r, u.config.CookieName)

	if err != nil {
		apierrors.HandleAPIError(w, u.config.Logger, apierrors.NewErrInternal(err))
		return
	}

	var redirect string

	if valR := session.Values["redirect"]; valR != nil {
		redirect = session.Values["redirect"].(string)
	}

	session.Values["authenticated"] = true
	session.Values["user_id"] = user.ID
	session.Values["email"] = user.Email
	session.Values["redirect"] = redirect

	if err := session.Save(r, w); err != nil {
		apierrors.HandleAPIError(w, u.config.Logger, apierrors.NewErrInternal(err))
		return
	}

	u.writer.WriteResult(w, user.ToUserType())
}

func doesUserExist(repo repository.Repository, user *models.User) bool {
	user, err := repo.User().ReadUserByEmail(user.Email)

	return user != nil && err == nil
}
