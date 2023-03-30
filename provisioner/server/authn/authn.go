package authn

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/provisioner/server/config"
	"golang.org/x/crypto/bcrypt"
)

// AuthNFactory generates a middleware handler `AuthN`
type AuthNStaticFactory struct {
	config *config.Config
}

// NewAuthNStaticFactory returns an `AuthNStaticFactory` that uses the passed-in server
// config
func NewAuthNStaticFactory(
	config *config.Config,
) *AuthNStaticFactory {
	return &AuthNStaticFactory{config}
}

// NewAuthenticated creates a new instance of `AuthN` that implements the http.Handler
// interface.
func (f *AuthNStaticFactory) NewAuthenticated(next http.Handler) http.Handler {
	return &AuthNStatic{next, f.config}
}

// AuthNStatic implements the authentication middleware
type AuthNStatic struct {
	next   http.Handler
	config *config.Config
}

// ServeHTTP calls next if the authentication token is valid,
// or serves a forbidden error.
func (authn *AuthNStatic) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// first check for a static bearer token
	err := authn.validateStaticTokenFromRequest(r)

	// if the error is not an invalid auth error, the token was invalid, and we throw error
	// forbidden. If the error was an invalid auth error, we look for a cookie.
	if err == nil {
		authn.next.ServeHTTP(w, r)
		return
	}

	authn.sendForbiddenError(err, w, r)
	return
}

// sendForbiddenError sends a 403 Forbidden error to the end user while logging a
// specific error
func (authn *AuthNStatic) sendForbiddenError(err error, w http.ResponseWriter, r *http.Request) {
	reqErr := apierrors.NewErrForbidden(err)

	apierrors.HandleAPIError(authn.config.Logger, authn.config.Alerter, w, r, reqErr, true)
}

var (
	errInvalidToken      = fmt.Errorf("authorization header exists, but token is not valid")
	errInvalidAuthHeader = fmt.Errorf("invalid authorization header in request")
)

// getTokenFromRequest finds an `Authorization` header of the form `Bearer <token>`,
// and returns a valid token if it exists.
func (authn *AuthNStatic) validateStaticTokenFromRequest(r *http.Request) error {
	reqToken := r.Header.Get("Authorization")
	splitToken := strings.Split(reqToken, "Bearer")

	if len(splitToken) != 2 {
		return errInvalidAuthHeader
	}

	reqToken = strings.TrimSpace(splitToken[1])

	// check that request token matches static config token
	if err := ValidateStaticToken(authn.config, reqToken); err != nil {
		return err
	}

	return nil
}

func ValidateStaticToken(config *config.Config, reqToken string) error {
	if reqToken != config.ProvisionerConf.StaticAuthToken {
		return errInvalidToken
	}

	return nil
}

// AuthNPorterTokenFactory generates a middleware handler `AuthN`
type AuthNPorterTokenFactory struct {
	config *config.Config
}

// NewAuthNPorterTokenFactory returns an `AuthNPorterTokenFactory` that uses the passed-in server
// config
func NewAuthNPorterTokenFactory(
	config *config.Config,
) *AuthNPorterTokenFactory {
	return &AuthNPorterTokenFactory{config}
}

// NewAuthenticated creates a new instance of `AuthN` that implements the http.Handler
// interface.
func (f *AuthNPorterTokenFactory) NewAuthenticated(next http.Handler) http.Handler {
	return &AuthNPorterToken{next, f.config}
}

// AuthNPorterToken implements the authentication middleware
type AuthNPorterToken struct {
	next   http.Handler
	config *config.Config
}

// ServeHTTP calls next if the authentication token is valid,
// or serves a forbidden error.
func (authn *AuthNPorterToken) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// next we check for an issued token
	ceToken, err := authn.getPorterTokenFromRequest(r)

	if err == nil {
		// attach ce token to context
		ctx := r.Context()
		ctx = context.WithValue(ctx, "ce_token", ceToken)
		r = r.Clone(ctx)

		authn.next.ServeHTTP(w, r)
		return
	}

	authn.sendForbiddenError(err, w, r)
	return
}

// sendForbiddenError sends a 403 Forbidden error to the end user while logging a
// specific error
func (authn *AuthNPorterToken) sendForbiddenError(err error, w http.ResponseWriter, r *http.Request) {
	reqErr := apierrors.NewErrForbidden(err)

	apierrors.HandleAPIError(authn.config.Logger, authn.config.Alerter, w, r, reqErr, true)
}

func (authn *AuthNPorterToken) getPorterTokenFromRequest(r *http.Request) (*models.CredentialsExchangeToken, error) {
	porterToken := r.Header.Get("X-Porter-Token")

	if porterToken == "" {
		return nil, fmt.Errorf("X-Porter-Token header does not exist")
	}

	porterTokenID, err := strconv.ParseUint(r.Header.Get("X-Porter-Token-ID"), 10, 64)
	if err != nil {
		return nil, errInvalidToken
	}

	return ValidatePorterToken(authn.config, uint(porterTokenID), porterToken)
}

func ValidatePorterToken(config *config.Config, tokenID uint, token string) (*models.CredentialsExchangeToken, error) {
	// read the access token in the header, check against DB
	ceToken, err := config.Repo.CredentialsExchangeToken().ReadCredentialsExchangeToken(tokenID)
	if err != nil {
		return nil, err
	}

	// make sure the token is still valid and has not expired
	if ceToken.IsExpired() {
		return nil, fmt.Errorf("token is expired")
	}

	// make sure the token is correct
	if err := bcrypt.CompareHashAndPassword([]byte(ceToken.Token), []byte(token)); err != nil {
		return nil, fmt.Errorf("verify token failed: %s", err)
	}

	return ceToken, nil
}
