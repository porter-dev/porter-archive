package authn

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"github.com/gorilla/sessions"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/auth/token"
	"github.com/porter-dev/porter/internal/models"
)

// AuthNFactory generates a middleware handler `AuthN`
type AuthNFactory struct {
	config *config.Config
}

// NewAuthNFactory returns an `AuthNFactory` that uses the passed-in server
// config
func NewAuthNFactory(
	config *config.Config,
) *AuthNFactory {
	return &AuthNFactory{config}
}

// NewAuthenticated creates a new instance of `AuthN` that implements the http.Handler
// interface.
func (f *AuthNFactory) NewAuthenticated(next http.Handler) http.Handler {
	return &AuthN{next, f.config, false}
}

// NewAuthenticatedWithRedirect creates a new instance of `AuthN` that implements the http.Handler
// interface. This handler redirects the user to login if the user is not attached, and stores a
// redirect URI in the session, if the session exists.
func (f *AuthNFactory) NewAuthenticatedWithRedirect(next http.Handler) http.Handler {
	return &AuthN{next, f.config, true}
}

// AuthN implements the authentication middleware
type AuthN struct {
	next     http.Handler
	config   *config.Config
	redirect bool
}

// ServeHTTP attaches an authenticated subject to the request context,
// or serves a forbidden error. If authenticated, it calls the next handler.
//
// A token can either be issued for a specific project id or for a user. In the case
// of a project id, we attach a service account to the context. In the case of a
// user, we attach that user to the context.
func (authn *AuthN) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// first check for a bearer token
	tok, err := authn.getTokenFromRequest(r)

	// if the error is not an invalid auth error, the token was invalid, and we throw error
	// forbidden. If the error was an invalid auth error, we look for a cookie.
	if err != nil && err != errInvalidAuthHeader {
		authn.sendForbiddenError(err, w, r)
		return
	} else if err == nil && tok != nil {
		authn.verifyTokenWithNext(w, r, tok)
		return
	}

	// if the bearer token is not found, look for a request cookie
	session, err := authn.config.Store.Get(r, authn.config.ServerConf.CookieName)

	if err != nil {
		session.Values["authenticated"] = false

		// we attempt to save the session, but do not catch the error since we send the
		// forbidden error regardless
		session.Save(r, w)

		authn.sendForbiddenError(err, w, r)
		return
	}

	if auth, ok := session.Values["authenticated"].(bool); !auth || !ok {
		authn.handleForbiddenForSession(w, r, fmt.Errorf("stored cookie was not authenticated"), session)
		return
	}

	// read the user id in the token
	userID, ok := session.Values["user_id"].(uint)

	if !ok {
		authn.handleForbiddenForSession(w, r, fmt.Errorf("could not cast user_id to uint"), session)
		return
	}

	authn.nextWithUserID(w, r, userID)
}

func (authn *AuthN) handleForbiddenForSession(
	w http.ResponseWriter,
	r *http.Request,
	err error,
	session *sessions.Session,
) {
	if authn.redirect {
		// need state parameter to validate when redirected
		if r.URL.RawQuery == "" {
			session.Values["redirect_uri"] = r.URL.Path
		} else {
			session.Values["redirect_uri"] = r.URL.Path + "?" + r.URL.RawQuery
		}

		session.Save(r, w)

		http.Redirect(w, r, "/dashboard", 302)
	} else {
		authn.sendForbiddenError(err, w, r)
	}

	return
}

func (authn *AuthN) verifyTokenWithNext(w http.ResponseWriter, r *http.Request, tok *token.Token) {
	// if the token has a stored token id and secret we check that the token is valid in the database
	if tok.Secret != "" && tok.TokenID != "" {
		apiToken, err := authn.config.Repo.APIToken().ReadAPIToken(tok.ProjectID, tok.TokenID)

		if err != nil {
			authn.sendForbiddenError(fmt.Errorf("token with id %s not valid", tok.TokenID), w, r)
			return
		}

		// first ensure that the token hasn't been revoked, and the token has not expired
		if apiToken.Revoked || apiToken.IsExpired() {
			authn.sendForbiddenError(fmt.Errorf("token with id %s not valid", tok.TokenID), w, r)
			return
		}

		authn.nextWithAPIToken(w, r, apiToken)
	} else {
		// otherwise we just use nextWithUser using the `iby` field for the token
		authn.nextWithUserID(w, r, tok.IBy)
	}
}

// nextWithAPIToken sets the token in context
func (authn *AuthN) nextWithAPIToken(w http.ResponseWriter, r *http.Request, tok *models.APIToken) {
	ctx := r.Context()
	ctx = context.WithValue(ctx, "api_token", tok)

	// add a service account user to the project: note that any calls depending on a DB lookup for the
	// user will fail
	ctx = context.WithValue(ctx, types.UserScope, &models.User{
		Email:         fmt.Sprintf("%s-%d", tok.Name, tok.ProjectID),
		EmailVerified: true,
	})

	r = r.Clone(ctx)
	authn.next.ServeHTTP(w, r)
}

// nextWithUserID calls the next handler with the user set in the context with key
// `types.UserScope`.
func (authn *AuthN) nextWithUserID(w http.ResponseWriter, r *http.Request, userID uint) {
	// search for the user
	user, err := authn.config.Repo.User().ReadUser(userID)

	if err != nil {
		authn.sendForbiddenError(fmt.Errorf("user with id %d not found in database", userID), w, r)
		return
	}

	// add the user to the context
	ctx := r.Context()
	ctx = context.WithValue(ctx, types.UserScope, user)

	r = r.Clone(ctx)
	authn.next.ServeHTTP(w, r)
}

// sendForbiddenError sends a 403 Forbidden error to the end user while logging a
// specific error
func (authn *AuthN) sendForbiddenError(err error, w http.ResponseWriter, r *http.Request) {
	reqErr := apierrors.NewErrForbidden(err)

	apierrors.HandleAPIError(authn.config.Logger, authn.config.Alerter, w, r, reqErr, true)
}

var errInvalidToken = fmt.Errorf("authorization header exists, but token is not valid")
var errInvalidAuthHeader = fmt.Errorf("invalid authorization header in request")

// getTokenFromRequest finds an `Authorization` header of the form `Bearer <token>`,
// and returns a valid token if it exists.
func (authn *AuthN) getTokenFromRequest(r *http.Request) (*token.Token, error) {
	reqToken := r.Header.Get("Authorization")
	splitToken := strings.Split(reqToken, "Bearer")

	if len(splitToken) != 2 {
		return nil, errInvalidAuthHeader
	}

	reqToken = strings.TrimSpace(splitToken[1])

	tok, err := token.GetTokenFromEncoded(reqToken, authn.config.TokenConf)

	if err != nil {
		return nil, errInvalidToken
	}

	return tok, nil
}
