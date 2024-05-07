package user

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/porter-dev/porter/api/types"

	"github.com/porter-dev/porter/internal/models"

	ory "github.com/ory/client-go"

	"github.com/porter-dev/porter/internal/telemetry"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
)

// MigrateUsersHandler migrates users into Ory
type MigrateUsersHandler struct {
	handlers.PorterHandler
}

// NewMigrateUsersHandler generates a handler for migrating users
func NewMigrateUsersHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *MigrateUsersHandler {
	return &MigrateUsersHandler{
		PorterHandler: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

// ServeHTTP migrates users into Ory
func (u *MigrateUsersHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-migrate-users")
	defer span.End()

	r = r.Clone(ctx)

	thisUser, _ := r.Context().Value(types.UserScope).(*models.User)
	if !strings.HasSuffix(thisUser.Email, "@porter.run") {
		err := telemetry.Error(ctx, span, nil, "user is not a porter user")
		u.HandleAPIError(w, r, apierrors.NewErrForbidden(err))
		return
	}

	users, err := u.Repo().User().ListUsers()
	if err != nil {
		err := telemetry.Error(ctx, span, nil, "error listing users")
		u.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	var usersMissingAuthMechanism []uint
	migrationErrors := map[string][]uint{}

	for _, user := range users {
		// skip users that are already migrated
		if user.AuthProvider == models.AuthProvider_Ory && user.ExternalId != "" {
			continue
		}

		createIdentityBody := ory.CreateIdentityBody{
			SchemaId: "preset://email",
			Traits:   map[string]interface{}{"email": user.Email},
		}

		if user.EmailVerified {
			createIdentityBody.VerifiableAddresses = []ory.VerifiableIdentityAddress{
				{
					Value:    user.Email,
					Verified: true,
					Via:      "email",
					Status:   "completed",
				},
			}
		}

		switch {
		case user.Password != "":
			password := user.Password
			createIdentityBody.Credentials = &ory.IdentityWithCredentials{
				Oidc: nil,
				Password: &ory.IdentityWithCredentialsPassword{
					Config: &ory.IdentityWithCredentialsPasswordConfig{
						HashedPassword: &password,
					},
				},
				AdditionalProperties: nil,
			}
		case user.GithubUserID != 0:
			createIdentityBody.Credentials = &ory.IdentityWithCredentials{
				Oidc: &ory.IdentityWithCredentialsOidc{
					Config: &ory.IdentityWithCredentialsOidcConfig{
						Config: nil,
						Providers: []ory.IdentityWithCredentialsOidcConfigProvider{
							{
								Provider: "github",
								Subject:  strconv.Itoa(int(user.GithubUserID)),
							},
						},
					},
				},
			}
		case user.GoogleUserID != "":
			createIdentityBody.Credentials = &ory.IdentityWithCredentials{
				Oidc: &ory.IdentityWithCredentialsOidc{
					Config: &ory.IdentityWithCredentialsOidcConfig{
						Config: nil,
						Providers: []ory.IdentityWithCredentialsOidcConfigProvider{
							{
								Provider: "google",
								Subject:  user.GoogleUserID,
							},
						},
					},
				},
			}
		default:
			usersMissingAuthMechanism = append(usersMissingAuthMechanism, user.ID)
			continue
		}

		createdIdentity, resp, err := u.Config().Ory.IdentityAPI.CreateIdentity(u.Config().OryApiKeyContextWrapper(ctx)).CreateIdentityBody(createIdentityBody).Execute()
		if err != nil {
			switch resp.StatusCode {
			// identity already exists, so we need to list the identities and find the one that matches
			case 409:
				identities, _, err := u.Config().Ory.IdentityAPI.ListIdentities(u.Config().OryApiKeyContextWrapper(ctx)).CredentialsIdentifier(user.Email).Execute()
				if err != nil {
					errString := fmt.Sprintf("error calling list identities``: %v\n", err)
					if len(migrationErrors[err.Error()]) == 0 {
						migrationErrors[errString] = []uint{}
					}
					migrationErrors[errString] = append(migrationErrors[errString], user.ID)
					continue
				}

				if len(identities) != 1 {
					errString := fmt.Sprintf("expected 1 identity, got %d", len(identities))
					if len(migrationErrors[err.Error()]) == 0 {
						migrationErrors[errString] = []uint{}
					}
					migrationErrors[errString] = append(migrationErrors[errString], user.ID)
					continue
				}

				createdIdentity = &identities[0]
			default:
				errString := fmt.Sprintf("error creating identity: %s", err.Error())
				if len(migrationErrors[err.Error()]) == 0 {
					migrationErrors[errString] = []uint{}
				}
				migrationErrors[errString] = append(migrationErrors[errString], user.ID)
				continue
			}
		}

		user.AuthProvider = models.AuthProvider_Ory
		user.ExternalId = createdIdentity.Id

		_, err = u.Repo().User().UpdateUser(user)
		if err != nil {
			errString := fmt.Sprintf("error updating user: %s", err.Error())
			if len(migrationErrors[err.Error()]) == 0 {
				migrationErrors[errString] = []uint{}
			}
			migrationErrors[errString] = append(migrationErrors[errString], user.ID)
			continue
		}
	}

	var errs []error
	if len(usersMissingAuthMechanism) > 0 {
		errs = append(errs, fmt.Errorf("users missing auth mechanism: %v", usersMissingAuthMechanism))
	}
	for errString, userIds := range migrationErrors {
		errs = append(errs, fmt.Errorf("%s: %v", errString, userIds))
	}

	if len(errs) > 0 {
		err := telemetry.Error(ctx, span, errors.Join(errs...), "error migrating users")
		u.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}
}
