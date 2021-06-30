package user

import (
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/authn"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"golang.org/x/crypto/bcrypt"
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

	// hash the password using bcrypt
	hashedPw, err := bcrypt.GenerateFromPassword([]byte(user.Password), 8)

	if err != nil {
		apierrors.HandleAPIError(w, u.config.Logger, apierrors.NewErrInternal(err))
		return
	}

	user.Password = string(hashedPw)

	// write the user to the db
	user, err = u.config.Repo.User().CreateUser(user)

	if err != nil {
		apierrors.HandleAPIError(w, u.config.Logger, apierrors.NewErrInternal(err))
		return
	}

	// save the user as authenticated in the session
	if err := authn.SaveUserAuthenticated(w, r, u.config, user); err != nil {
		apierrors.HandleAPIError(w, u.config.Logger, apierrors.NewErrInternal(err))
		return
	}

	u.writer.WriteResult(w, user.ToUserType())
}

func doesUserExist(repo repository.Repository, user *models.User) bool {
	user, err := repo.User().ReadUserByEmail(user.Email)

	return user != nil && err == nil
}
