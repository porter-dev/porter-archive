package user

import (
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

	user, _ := r.Context().Value(types.UserScope).(*models.User)
	if !strings.HasSuffix(user.Email, "@porter.run") {
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
	migrationErrors := map[uint]string{}

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

		if user.Password != "" {
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
		} else if user.GithubUserID != 0 {
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
		} else if user.GoogleUserID != "" {
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
		} else {
			usersMissingAuthMechanism = append(usersMissingAuthMechanism, user.ID)
			continue
		}

		createdIdentity, _, err := u.Config().Ory.IdentityAPI.CreateIdentity(u.Config().OryApiKeyContextWrapper(ctx)).CreateIdentityBody(createIdentityBody).Execute()
		if err != nil {
			migrationErrors[user.ID] = fmt.Sprintf("error creating identity: %s", err.Error())
			continue
		}

		user.AuthProvider = models.AuthProvider_Ory
		user.ExternalId = createdIdentity.Id

		_, err = u.Repo().User().UpdateUser(user)
		if err != nil {
			migrationErrors[user.ID] = fmt.Sprintf("error updating user: %s", err.Error())
			continue
		}
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "users-missing-auth-mechanism", Value: usersMissingAuthMechanism},
		telemetry.AttributeKV{Key: "migration-errors", Value: migrationErrors},
	)

	if len(usersMissingAuthMechanism) > 0 || len(migrationErrors) > 0 {
		err := telemetry.Error(ctx, span, nil, "error migrating users")
		u.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}
}
