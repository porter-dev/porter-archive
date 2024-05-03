package user

import (
	"context"
	"fmt"
	"net/http"
	"strconv"

	"github.com/davecgh/go-spew/spew"

	ory "github.com/ory/client-go"

	"github.com/porter-dev/porter/internal/telemetry"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
)

type MigrateUsersHandler struct {
	handlers.PorterHandler
}

func NewMigrateUsersHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *MigrateUsersHandler {
	return &MigrateUsersHandler{
		PorterHandler: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (u *MigrateUsersHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-migrate-users")
	defer span.End()

	r = r.Clone(ctx)

	users, err := u.Repo().User().ListUsers()
	if err != nil {
		err := telemetry.Error(ctx, span, nil, "error listing users")
		u.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	for _, user := range users {
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
			continue
		}

		createdIdentity, resp, err := u.Config().Ory.IdentityAPI.CreateIdentity(context.WithValue(ctx, ory.ContextAccessToken, u.Config().OryApiKey)).CreateIdentityBody(createIdentityBody).Execute()
		if err != nil {
			switch resp.StatusCode {
			// identity already exists, so we need to list the identities and find the one that matches
			case 409:
				identities, _, err := u.Config().Ory.IdentityAPI.ListIdentities(context.WithValue(ctx, ory.ContextAccessToken, u.Config().OryApiKey)).CredentialsIdentifier(user.Email).Execute()
				if err != nil {
					fmt.Printf("Error when calling `IdentityApi.ListIdentities``: %v\n", err)
					continue
				}

				if len(identities) != 1 {
					fmt.Printf("Error when calling `IdentityApi.ListIdentities``: expected 1 identity, got %d\n", len(identities))
					continue
				}

				createdIdentity = &identities[0]
			default:
				fmt.Printf("Error when calling `IdentityApi.CreateIdentity``: %v\n", err)
				continue
			}
		}

		user.AuthProvider = "ory"
		user.ExternalId = createdIdentity.Id

		_, err = u.Repo().User().UpdateUser(user)
		if err != nil {
			fmt.Printf("Error when updating user: %v\n", err)
		}

		spew.Dump(createdIdentity)
	}
}
