package user_test

import (
	"testing"

	"github.com/porter-dev/porter/api/server/handlers/user"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apitest"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/repository/test"
	"github.com/stretchr/testify/assert"
	"gorm.io/gorm"
)

func TestDeleteUserSuccessful(t *testing.T) {
	req, rr := apitest.GetRequestAndRecorder(
		t,
		string(types.HTTPVerbDelete),
		"/api/users/current",
		nil,
	)

	config := apitest.LoadConfig(t)
	authUser := apitest.CreateTestUser(t, config)
	req = apitest.WithAuthenticatedUser(t, req, authUser)

	handler := user.NewUserDeleteHandler(
		config,
		shared.NewDefaultResultWriter(config),
	)

	handler.ServeHTTP(rr, req)

	expUser := &types.CreateUserResponse{
		ID:            1,
		Email:         "test@test.it",
		EmailVerified: true,
	}

	gotUser := &types.CreateUserResponse{}

	apitest.AssertResponseExpected(t, rr, expUser, gotUser)

	// assert that the user has been deleted
	authUser, err := config.Repo.User().ReadUser(1)

	targetErr := gorm.ErrRecordNotFound

	assert.ErrorIs(t, err, targetErr)
}

func TestFailingDeleteUserMethod(t *testing.T) {
	req, rr := apitest.GetRequestAndRecorder(
		t,
		string(types.HTTPVerbDelete),
		"/api/users/current",
		nil,
	)

	config := apitest.LoadConfig(t, test.DeleteUserMethod)
	authUser := apitest.CreateTestUser(t, config)
	req = apitest.WithAuthenticatedUser(t, req, authUser)

	handler := user.NewUserDeleteHandler(
		config,
		shared.NewDefaultResultWriter(config),
	)

	handler.ServeHTTP(rr, req)

	apitest.AssertResponseInternalServerError(t, rr)
}
