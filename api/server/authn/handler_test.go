package authn_test

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/porter-dev/porter/api/server/authn"
	"github.com/porter-dev/porter/api/server/shared/apitest"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
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
	user := apitest.CreateTestUser(t, config, true)
	cookie := apitest.AuthenticateUserWithCookie(t, config, user, false)
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

func TestUnauthenticatedUserWithCookieRedirect(t *testing.T) {
	_, handler, next := loadHandlersWithRedirect(t)

	req, err := http.NewRequest("GET", "/auth-endpoint", nil)

	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()

	// make the request without a cookie set
	handler.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusFound, rr.Result().StatusCode)
	gotLoc, err := rr.Result().Location()

	if err != nil {
		t.Fatal(err)
	}

	assert.Equal(t, "/dashboard", gotLoc.Path)
	assert.False(t, next.WasCalled, "next handler should not have been called")
}

func TestAuthenticatedUserWithToken(t *testing.T) {
	config, handler, next := loadHandlers(t)

	req, err := http.NewRequest("GET", "/auth-endpoint", nil)

	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()

	// create a new user for the token to reference
	user := apitest.CreateTestUser(t, config, true)
	tokenStr := apitest.AuthenticateUserWithToken(t, config, user.ID)
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
	user := apitest.CreateTestUser(t, config, true)
	cookie := apitest.AuthenticateUserWithCookie(t, config, user, false)
	req.AddCookie(cookie)

	// set the repository interface to one that can't query from the db
	configLoader := apitest.NewTestConfigLoader(false)
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
	apitest.CreateTestUser(t, config, true)

	// create cookie where session values are incorrect
	// i.e. written for a user that doesn't exist (id 500)
	cookie := apitest.AuthenticateUserWithCookie(t, config, &models.User{
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
	user := apitest.CreateTestUser(t, config, true)

	// create cookie where session values are incorrect
	// i.e. written for a user that doesn't exist (id 500)
	cookie := apitest.AuthenticateUserWithCookie(t, config, user, true)

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

func loadHandlers(t *testing.T) (*config.Config, http.Handler, *testHandler) {
	config := apitest.LoadConfig(t)

	factory := authn.NewAuthNFactory(config)

	next := &testHandler{}
	handler := factory.NewAuthenticated(next)

	return config, handler, next
}

func loadHandlersWithRedirect(t *testing.T) (*config.Config, http.Handler, *testHandler) {
	config := apitest.LoadConfig(t)

	factory := authn.NewAuthNFactory(config)

	next := &testHandler{}
	handler := factory.NewAuthenticatedWithRedirect(next)

	return config, handler, next
}

func assertForbiddenError(t *testing.T, next *testHandler, rr *httptest.ResponseRecorder) {
	assert := assert.New(t)

	// first assert that that the next middleware was not called
	assert.False(next.WasCalled, "next handler should not have been called")

	apitest.AssertResponseForbidden(t, rr)
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
