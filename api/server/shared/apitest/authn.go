package apitest

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/auth/token"
	"github.com/porter-dev/porter/internal/models"
)

// AuthenticateUserWithCookie uses the session store to create a cookie for a user
func AuthenticateUserWithCookie(
	t *testing.T,
	config *config.Config,
	user *models.User,
	badUserIDType bool,
) *http.Cookie {
	rr2 := httptest.NewRecorder()
	req2, err := http.NewRequest("GET", "/login", nil)

	if err != nil {
		t.Fatal(err)
	}

	// set the user as authenticated
	session, err := config.Store.Get(req2, config.ServerConf.CookieName)

	if err != nil {
		t.Fatal(err)
	}

	session.Values["authenticated"] = true
	session.Values["user_id"] = user.ID
	session.Values["email"] = user.Email

	if badUserIDType {
		session.Values["user_id"] = "badtype"
	}

	if err := session.Save(req2, rr2); err != nil {
		t.Fatal(err)
	}

	var cookie *http.Cookie

	if cookies := rr2.Result().Cookies(); len(cookies) > 0 {
		cookie = cookies[0]
	} else {
		t.Fatal(fmt.Errorf("no cookie in response"))
	}

	return cookie
}

// AuthenticateUserWithToken uses the JWT token generator to create a token for a user
func AuthenticateUserWithToken(t *testing.T, config *config.Config, userID uint) string {
	issToken, err := token.GetTokenForUser(userID)

	if err != nil {
		t.Fatal(err)
	}

	res, err := issToken.EncodeToken(config.TokenConf)

	if err != nil {
		t.Fatal(err)
	}

	return res
}

func WithAuthenticatedUser(t *testing.T, req *http.Request, user *models.User) *http.Request {
	ctx := req.Context()
	ctx = context.WithValue(ctx, types.UserScope, user)
	req = req.WithContext(ctx)

	return req
}
