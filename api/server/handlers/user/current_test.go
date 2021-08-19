package user_test

import (
	"testing"

	"github.com/porter-dev/porter/api/server/handlers/user"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apitest"
	"github.com/porter-dev/porter/api/types"
)

func TestGetCurrentUserSuccessful(t *testing.T) {
	config := apitest.LoadConfig(t)
	authUser := apitest.CreateTestUser(t, config, true)
	req, rr := apitest.GetRequestAndRecorder(t, string(types.HTTPVerbPost), "/api/auth/check", nil)

	req = apitest.WithAuthenticatedUser(t, req, authUser)

	handler := user.NewUserGetCurrentHandler(
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
