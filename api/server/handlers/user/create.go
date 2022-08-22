package user

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/authn"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/analytics"
	"github.com/porter-dev/porter/internal/encryption"
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

			err = createNewRole(project.ID, types.RoleAdmin, config.Repo.ProjectRole(), config.Repo.Policy())

			if err != nil {
				return err
			}

			err = createNewRole(project.ID, types.RoleAdmin, config.Repo.ProjectRole(), config.Repo.Policy())

			if err != nil {
				return err
			}

			err = createNewRole(project.ID, types.RoleAdmin, config.Repo.ProjectRole(), config.Repo.Policy())

			if err != nil {
				return err
			}

			// attach user to admin role
			err = config.Repo.ProjectRole().UpdateUsersInProjectRole(project.ID, fmt.Sprintf("%d-%s", project.ID, types.RoleAdmin), []uint{user.ID})

			if err != nil {
				return err
			}
		}
	}

	return nil
}

func createNewRole(
	projectID uint,
	kind types.RoleKind,
	projectRoleRepo repository.ProjectRoleRepository,
	policyRepo repository.PolicyRepository,
) error {
	// for legacy roles - admin, developer, viewer (kinds)
	// default role name such as <project ID>-<kind> for uniqueness
	// similarly, create policy for each new default role as <project ID>-<kind>-project-role-policy

	uid, err := encryption.GenerateRandomBytes(16)

	if err != nil {
		return err
	}

	var policyBytes []byte

	switch kind {
	case types.RoleAdmin:
		policyBytes, err = json.Marshal(types.AdminPolicy)

		if err != nil {
			return err
		}
	case types.RoleDeveloper:
		policyBytes, err = json.Marshal(types.DeveloperPolicy)

		if err != nil {
			return err
		}
	case types.RoleViewer:
		policyBytes, err = json.Marshal(types.ViewerPolicy)

		if err != nil {
			return err
		}
	}

	newPolicy, err := policyRepo.CreatePolicy(&models.Policy{
		UniqueID:    uid,
		ProjectID:   projectID,
		Name:        fmt.Sprintf("%s-project-role-policy", kind),
		PolicyBytes: policyBytes,
	})

	if err != nil {
		return err
	}

	_, err = projectRoleRepo.CreateProjectRole(&models.ProjectRole{
		UniqueID:  fmt.Sprintf("%d-%s", projectID, kind),
		ProjectID: projectID,
		PolicyUID: newPolicy.UniqueID,
		Name:      string(kind),
	})

	if err != nil {
		// delete newly created policy first
		policyRepo.DeletePolicy(newPolicy)

		return err
	}

	return nil
}
