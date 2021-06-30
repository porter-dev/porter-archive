package user_test

import (
	"net/http"
	"testing"

	"github.com/porter-dev/porter/api/server/handlers/user"
	"github.com/porter-dev/porter/api/server/shared/apitest"
	"github.com/porter-dev/porter/api/types"
	"github.com/stretchr/testify/assert"
)

func TestLogoutUserSuccessful(t *testing.T) {
	req, rr := apitest.GetRequestAndRecorder(
		t,
		string(types.HTTPVerbPost),
		"/api/logout",
		nil,
	)

	config := apitest.LoadConfig(t)
	authUser := apitest.CreateTestUser(t, config)
	apitest.WithAuthenticatedUser(t, req, authUser)

	handler := user.NewUserLogoutHandler(config)

	handler.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusOK, rr.Result().StatusCode, "status code should be 200")

	// read the session to make sure "authenticated" is false
	session, err := config.Store.Get(req, config.CookieName)

	if err != nil {
		t.Fatal(err)
	}

	assert.False(t, session.Values["authenticated"].(bool), "authenticated in session should be false")
}
