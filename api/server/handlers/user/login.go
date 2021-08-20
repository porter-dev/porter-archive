package user

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/authn"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/types"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type UserLoginHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewUserLoginHandler(
	config *shared.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *UserLoginHandler {
	return &UserLoginHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (u *UserLoginHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	request := &types.LoginUserRequest{}

	ok := u.DecodeAndValidate(w, r, request)

	if !ok {
		return
	}

	// check that passwords match
	storedUser, err := u.Repo().User().ReadUserByEmail(request.Email)

	// case on user not existing, send forbidden error if not exist
	if err != nil {
		if targetErr := gorm.ErrRecordNotFound; errors.Is(err, targetErr) {
			u.HandleAPIError(w, apierrors.NewErrForbidden(err))
			return
		} else {
			u.HandleAPIError(w, apierrors.NewErrInternal(err))
			return
		}
	}

	if err := bcrypt.CompareHashAndPassword([]byte(storedUser.Password), []byte(request.Password)); err != nil {
		reqErr := apierrors.NewErrPassThroughToClient(fmt.Errorf("incorrect password"), http.StatusUnauthorized)
		u.HandleAPIError(w, reqErr)
		return
	}

	// save the user as authenticated in the session
	if err := authn.SaveUserAuthenticated(w, r, u.Config(), storedUser); err != nil {
		u.HandleAPIError(w, apierrors.NewErrInternal(err))
		return
	}

	u.WriteResult(w, storedUser.ToUserType())
}
