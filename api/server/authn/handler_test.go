package authn_test

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/porter-dev/porter/api/server/authn"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/test"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/auth/token"
	"github.com/porter-dev/porter/internal/models"
	"github.com/stretchr/testify/assert"
	"gorm.io/gorm"
)

func TestAuthenticatedUserWithCookie(t *testing.T) {
	config, handler, next := loadHandlers(t)

	req, err := http.NewRequest("GET", "/auth-endpoint", nil)

	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()

	// create a new user and a cookie for them
	user, err := config.Repo.User().CreateUser(&models.User{
		Email:         "test@test.it",
		Password:      "hello",
		EmailVerified: true,
	})

	if err != nil {
		t.Fatal(err)
	}

	cookie := authenticateUserWithCookie(t, config, user, false)
	req.AddCookie(cookie)

	handler.ServeHTTP(rr, req)

	assertNextHandlerCalled(t, next, rr, user)
}

func TestUnauthenticatedUserWithCookie(t *testing.T) {
	_, handler, next := loadHandlers(t)

	req, err := http.NewRequest("GET", "/auth-endpoint", nil)

	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()

	// make the request without a cookie set
	handler.ServeHTTP(rr, req)

	assertForbiddenError(t, next, rr)
}

func TestAuthenticatedUserWithToken(t *testing.T) {
	config, handler, next := loadHandlers(t)

	req, err := http.NewRequest("GET", "/auth-endpoint", nil)

	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()

	// create a new user for the token to reference
	user, err := config.Repo.User().CreateUser(&models.User{
		Email:         "test@test.it",
		Password:      "hello",
		EmailVerified: true,
	})

	if err != nil {
		t.Fatal(err)
	}

	tokenStr := authenticateUserWithToken(t, config, user.ID)
	req.Header.Add("Authorization", fmt.Sprintf("Bearer %s", tokenStr))

	handler.ServeHTTP(rr, req)

	assertNextHandlerCalled(t, next, rr, user)
}

func TestUnauthenticatedUserWithToken(t *testing.T) {
	_, handler, next := loadHandlers(t)

	req, err := http.NewRequest("GET", "/auth-endpoint", nil)

	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()

	// create a new user and a cookie for them
	tokenStr := "badtokenstring"
	req.Header.Add("Authorization", fmt.Sprintf("Bearer %s", tokenStr))

	handler.ServeHTTP(rr, req)

	assertForbiddenError(t, next, rr)
}

func TestAuthBadDatabaseRead(t *testing.T) {
	config, handler, next := loadHandlers(t)

	req, err := http.NewRequest("GET", "/auth-endpoint", nil)

	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()

	// create a new user and a cookie for them
	user, err := config.Repo.User().CreateUser(&models.User{
		Email:         "test@test.it",
		Password:      "hello",
		EmailVerified: true,
	})

	if err != nil {
		t.Fatal(err)
	}

	cookie := authenticateUserWithCookie(t, config, user, false)
	req.AddCookie(cookie)

	// set the repository interface to one that can't query from the db
	configLoader := test.NewTestConfigLoader(false)
	config, err = configLoader.LoadConfig()
	factory := authn.NewAuthNFactory(config)
	handler = factory.NewAuthenticated(next)

	handler.ServeHTTP(rr, req)

	assertForbiddenError(t, next, rr)
}

func TestAuthBadSessionUserWrite(t *testing.T) {
	config, handler, next := loadHandlers(t)

	req, err := http.NewRequest("GET", "/auth-endpoint", nil)

	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()

	// create a new user and a cookie for them
	_, err = config.Repo.User().CreateUser(&models.User{
		Email:         "test@test.it",
		Password:      "hello",
		EmailVerified: true,
	})

	if err != nil {
		t.Fatal(err)
	}

	// create cookie where session values are incorrect
	// i.e. written for a user that doesn't exist (id 500)
	cookie := authenticateUserWithCookie(t, config, &models.User{
		Model: gorm.Model{
			ID: 500,
		},
	}, false)

	req.AddCookie(cookie)
	handler.ServeHTTP(rr, req)

	assertForbiddenError(t, next, rr)
}

func TestAuthBadSessionUserIDType(t *testing.T) {
	config, handler, next := loadHandlers(t)

	req, err := http.NewRequest("GET", "/auth-endpoint", nil)

	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()

	// create a new user and a cookie for them
	user, err := config.Repo.User().CreateUser(&models.User{
		Email:         "test@test.it",
		Password:      "hello",
		EmailVerified: true,
	})

	if err != nil {
		t.Fatal(err)
	}

	// create cookie where session values are incorrect
	// i.e. written for a user that doesn't exist (id 500)
	cookie := authenticateUserWithCookie(t, config, user, true)

	req.AddCookie(cookie)
	handler.ServeHTTP(rr, req)

	assertForbiddenError(t, next, rr)
}

type testHandler struct {
	WasCalled bool
	User      *models.User
}

func (t *testHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	t.WasCalled = true

	user, _ := r.Context().Value(types.UserScope).(*models.User)

	t.User = user
}

func loadHandlers(t *testing.T) (*shared.Config, http.Handler, *testHandler) {
	configLoader := test.NewTestConfigLoader(true)

	config, err := configLoader.LoadConfig()

	if err != nil {
		t.Fatal(err)
	}

	factory := authn.NewAuthNFactory(config)

	next := &testHandler{}
	handler := factory.NewAuthenticated(next)

	return config, handler, next
}

// authenticateUserWithCookie uses the session store to create a cookie for a user
func authenticateUserWithCookie(
	t *testing.T,
	config *shared.Config,
	user *models.User,
	badUserIDType bool,
) *http.Cookie {
	rr2 := httptest.NewRecorder()
	req2, err := http.NewRequest("GET", "/login", nil)

	if err != nil {
		t.Fatal(err)
	}

	// set the user as authenticated
	session, err := config.Store.Get(req2, config.CookieName)

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

// authenticateUserWithToken uses the JWT token generator to create a token for a user
func authenticateUserWithToken(t *testing.T, config *shared.Config, userID uint) string {
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

func assertForbiddenError(t *testing.T, next *testHandler, rr *httptest.ResponseRecorder) {
	assert := assert.New(t)

	assert.False(next.WasCalled, "next handler should not have been called")
	assert.Equal(http.StatusForbidden, rr.Result().StatusCode, "status code should be forbidden")

	// json error should be forbidden
	reqErr := &types.ExternalError{}
	err := json.NewDecoder(rr.Result().Body).Decode(reqErr)

	if err != nil {
		t.Fatal(err)
	}

	expReqErr := &types.ExternalError{
		Error: "Forbidden",
	}

	assert.Equal(expReqErr, reqErr, "body should be forbidden error")
}

func assertNextHandlerCalled(
	t *testing.T,
	next *testHandler,
	rr *httptest.ResponseRecorder,
	expUser *models.User,
) {
	// make sure the handler was called with the expected user, and resulted in 200 OK
	assert := assert.New(t)

	assert.True(next.WasCalled, "next handler should have been called")
	assert.Equal(expUser, next.User, "user should be equal")
	assert.Equal(http.StatusOK, rr.Result().StatusCode, "status code should be ok")
}
