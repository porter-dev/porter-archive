package user_test

import (
	"testing"

	"github.com/porter-dev/porter/api/server/handlers/user"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apitest"
	"github.com/porter-dev/porter/api/types"
)

func TestAuthCheckSuccessful(t *testing.T) {
	// create a test project
	config := apitest.LoadConfig(t)
	authUser := apitest.CreateTestUser(t, config)
	req, rr := apitest.GetRequestAndRecorder(t, string(types.HTTPVerbPost), "/api/auth/check", nil)

	req = apitest.WithAuthenticatedUser(t, req, authUser)

	handler := user.NewAuthCheckHandler(
		config,
		shared.NewDefaultResultWriter(config),
	)

	handler.ServeHTTP(rr, req)

	expUser := &types.GetAuthenticatedUserResponse{
		ID:            1,
		Email:         "test@test.it",
		EmailVerified: true,
	}

	gotUser := &types.GetAuthenticatedUserResponse{}

	apitest.AssertResponseExpected(t, rr, expUser, gotUser)
}
