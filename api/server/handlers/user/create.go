package user

import (
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/authn"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/analytics"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"golang.org/x/crypto/bcrypt"
)

type UserCreateHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewUserCreateHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *UserCreateHandler {
	return &UserCreateHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (u *UserCreateHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	request := &types.CreateUserRequest{}

	ok := u.DecodeAndValidate(w, r, request)

	if !ok {
		return
	}

	user := &models.User{
		Email:    request.Email,
		Password: request.Password,
	}

	// check if user exists
	doesExist := doesUserExist(u.Repo().User(), user)

	if doesExist {
		err := fmt.Errorf("email already taken")
		u.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	// hash the password using bcrypt
	hashedPw, err := bcrypt.GenerateFromPassword([]byte(user.Password), 8)

	if err != nil {
		u.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	user.Password = string(hashedPw)

	// write the user to the db
	user, err = u.Repo().User().CreateUser(user)

	if err != nil {
		u.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// save the user as authenticated in the session
	if err := authn.SaveUserAuthenticated(w, r, u.Config(), user); err != nil {
		u.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	u.Config().AnalyticsClient.Identify(analytics.CreateSegmentIdentifyUser(user))

	u.Config().AnalyticsClient.Track(analytics.UserCreateTrack(&analytics.UserCreateTrackOpts{
		UserScopedTrackOpts: analytics.GetUserScopedTrackOpts(user.ID),
		Email:               user.Email,
	}))

	u.WriteResult(w, r, user.ToUserType())
}

func doesUserExist(userRepo repository.UserRepository, user *models.User) bool {
	user, err := userRepo.ReadUserByEmail(user.Email)

	return user != nil && err == nil
}
