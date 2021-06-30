package user

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/authn"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/types"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type UserLoginHandler struct {
	config           *shared.Config
	decoderValidator shared.RequestDecoderValidator
	writer           shared.ResultWriter
}

func NewUserLoginHandler(
	config *shared.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *UserLoginHandler {
	return &UserLoginHandler{config, decoderValidator, writer}
}

func (u *UserLoginHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	request := &types.LoginUserRequest{}

	ok := u.decoderValidator.DecodeAndValidate(w, r, request)

	if !ok {
		return
	}

	// check that passwords match
	storedUser, err := u.config.Repo.User().ReadUserByEmail(request.Email)

	// case on user not existing, send forbidden error if not exist
	if err != nil {
		if targetErr := gorm.ErrRecordNotFound; errors.Is(err, targetErr) {
			apierrors.HandleAPIError(w, u.config.Logger, apierrors.NewErrForbidden(err))
			return
		} else {
			apierrors.HandleAPIError(w, u.config.Logger, apierrors.NewErrInternal(err))
			return
		}
	}

	if err := bcrypt.CompareHashAndPassword([]byte(storedUser.Password), []byte(request.Password)); err != nil {
		apierrors.HandleAPIError(
			w,
			u.config.Logger,
			apierrors.NewErrPassThroughToClient(
				fmt.Errorf("incorrect password"),
				http.StatusUnauthorized,
			),
		)

		return
	}

	// save the user as authenticated in the session
	if err := authn.SaveUserAuthenticated(w, r, u.config, storedUser); err != nil {
		apierrors.HandleAPIError(w, u.config.Logger, apierrors.NewErrInternal(err))
		return
	}

	u.writer.WriteResult(w, storedUser.ToUserType())
}
