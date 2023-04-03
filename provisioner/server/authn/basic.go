package authn

import (
	"context"
	"fmt"
	"net/http"
	"strconv"

	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/provisioner/server/config"
)

// AuthNFactory generates a middleware handler `AuthN`
type AuthNBasicFactory struct {
	config *config.Config
}

// NewAuthNBasicFactory returns an `AuthNBasicFactory` that uses the passed-in server
// config
func NewAuthNBasicFactory(
	config *config.Config,
) *AuthNBasicFactory {
	return &AuthNBasicFactory{config}
}

// NewAuthenticated creates a new instance of `AuthN` that implements the http.Handler
// interface.
func (f *AuthNBasicFactory) NewAuthenticated(next http.Handler) http.Handler {
	return &AuthNBasic{next, f.config}
}

// AuthNStatic implements the authentication middleware
type AuthNBasic struct {
	next   http.Handler
	config *config.Config
}

// ServeHTTP calls next if the authentication token is valid,
// or serves a forbidden error.
func (authn *AuthNBasic) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	porterTokenIDStr, porterToken, ok := r.BasicAuth()

	if ok {
		if porterToken == "" {
			authn.sendForbiddenError(fmt.Errorf("porter token does not exist"), w, r)
			return
		}

		porterTokenID, err := strconv.ParseUint(porterTokenIDStr, 10, 64)
		if err != nil {
			authn.sendForbiddenError(err, w, r)
			return
		}

		ceToken, err := ValidatePorterToken(authn.config, uint(porterTokenID), porterToken)
		if err != nil {
			authn.sendForbiddenError(err, w, r)
			return
		}

		// attach ce token to context
		ctx := r.Context()
		ctx = context.WithValue(ctx, "ce_token", ceToken)
		r = r.Clone(ctx)

		authn.next.ServeHTTP(w, r)
		return
	}

	authn.sendForbiddenError(fmt.Errorf("no basic auth credentials"), w, r)
	return
}

func (authn *AuthNBasic) sendForbiddenError(err error, w http.ResponseWriter, r *http.Request) {
	w.Header().Set("WWW-Authenticate", `Basic realm="restricted", charset="UTF-8"`)
	reqErr := apierrors.NewErrForbidden(err)
	apierrors.HandleAPIError(authn.config.Logger, authn.config.Alerter, w, r, reqErr, true)
	return
}
