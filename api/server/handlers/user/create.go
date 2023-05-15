package user

import (
	"context"
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/internal/telemetry"

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
	tracer, _ := telemetry.InitTracer(context.Background(), u.Config().TelemetryConfig)
	defer tracer.Shutdown()

	// just for demonstration purposes
	_, span := telemetry.NewSpan(context.Background(), "create-new-user")
	defer span.End()
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "hello-world", Value: "hello, world!"})

	request := &types.CreateUserRequest{}

	ok := u.DecodeAndValidate(w, r, request)

	if !ok {
		return
	}

	user := &models.User{
		Email:       request.Email,
		Password:    request.Password,
		FirstName:   request.FirstName,
		LastName:    request.LastName,
		CompanyName: request.CompanyName,
	}

	// check if user exists
	doesExist := doesUserExist(u.Repo().User(), user)

	if doesExist {
		err := fmt.Errorf("email already taken")
		u.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	if err := checkUserRestrictions(u.Config().ServerConf, request.Email); err != nil {
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

	err = addUserToDefaultProject(u.Config(), user)

	if err != nil {
		u.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// save the user as authenticated in the session
	redirect, err := authn.SaveUserAuthenticated(w, r, u.Config(), user)
	if err != nil {
		u.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// non-fatal send email verification
	if !user.EmailVerified {
		err = startEmailVerification(u.Config(), w, r, user)

		if err != nil {
			u.HandleAPIErrorNoWrite(w, r, apierrors.NewErrInternal(err))
		}
	}

	u.Config().AnalyticsClient.Identify(analytics.CreateSegmentIdentifyUser(user))

	u.Config().AnalyticsClient.Track(analytics.UserCreateTrack(&analytics.UserCreateTrackOpts{
		UserScopedTrackOpts: analytics.GetUserScopedTrackOpts(user.ID),
		Email:               user.Email,
		FirstName:           user.FirstName,
		LastName:            user.LastName,
		CompanyName:         user.CompanyName,
	}))

	if redirect != "" {
		http.Redirect(w, r, redirect, http.StatusFound)
		return
	}

	u.WriteResult(w, r, user.ToUserType())
}

func doesUserExist(userRepo repository.UserRepository, user *models.User) bool {
	user, err := userRepo.ReadUserByEmail(user.Email)

	return user != nil && err == nil
}

// addUserToDefaultProject adds the created user to any default projects if required by
// config variables.
func addUserToDefaultProject(config *config.Config, user *models.User) error {
	if config.ServerConf.InitInCluster {
		// if this is the first user, add the user to the default project
		if user.ID == 1 {
			// read the default project
			project, err := config.Repo.Project().ReadProject(1)
			if err != nil {
				return err
			}

			// create a new Role with the user as the admin
			_, err = config.Repo.Project().CreateProjectRole(project, &models.Role{
				Role: types.Role{
					UserID:    user.ID,
					ProjectID: project.ID,
					Kind:      types.RoleAdmin,
				},
			})

			if err != nil {
				return err
			}
		}
	}

	return nil
}
