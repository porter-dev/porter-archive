package user_test

import (
	"fmt"
	"net/http"
	"testing"

	"github.com/porter-dev/porter/api/server/handlers/user"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apitest"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/repository/test"
)

func TestCreateUserSuccessful(t *testing.T) {
	req, rr := apitest.GetRequestAndRecorder(
		t,
		string(types.HTTPVerbPost),
		"/api/users",
		&types.CreateUserRequest{
			Email:    "test@test.it",
			Password: "somepassword",
		},
	)

	config := apitest.LoadConfig(t)

	handler := user.NewUserCreateHandler(
		config,
		shared.NewDefaultRequestDecoderValidator(config),
		shared.NewDefaultResultWriter(config),
	)

	handler.ServeHTTP(rr, req)

	expUser := &types.CreateUserResponse{
		ID:            1,
		Email:         "test@test.it",
		EmailVerified: false,
	}

	gotUser := &types.CreateUserResponse{}

	apitest.AssertResponseExpected(t, rr, expUser, gotUser)
}

func TestCreateUserBadEmail(t *testing.T) {
	req, rr := apitest.GetRequestAndRecorder(
		t,
		string(types.HTTPVerbPost),
		"/api/users",
		&types.CreateUserRequest{
			Email:    "notanemail",
			Password: "somepassword",
		},
	)

	config := apitest.LoadConfig(t)

	handler := user.NewUserCreateHandler(
		config,
		shared.NewDefaultRequestDecoderValidator(config),
		shared.NewDefaultResultWriter(config),
	)

	handler.ServeHTTP(rr, req)

	apitest.AssertResponseError(t, rr, http.StatusBadRequest, &types.ExternalError{
		Error: fmt.Sprintf("validation failed on field 'Email' on condition 'email'"),
	})
}

func TestCreateUserMissingField(t *testing.T) {
	req, rr := apitest.GetRequestAndRecorder(
		t,
		string(types.HTTPVerbPost),
		"/api/users",
		&types.CreateUserRequest{
			Email: "test@test.it",
		},
	)

	config := apitest.LoadConfig(t)

	handler := user.NewUserCreateHandler(
		config,
		shared.NewDefaultRequestDecoderValidator(config),
		shared.NewDefaultResultWriter(config),
	)

	handler.ServeHTTP(rr, req)

	apitest.AssertResponseError(t, rr, http.StatusBadRequest, &types.ExternalError{
		Error: fmt.Sprintf("validation failed on field 'Password' on condition 'required'"),
	})
}

func TestCreateUserSameEmail(t *testing.T) {
	req, rr := apitest.GetRequestAndRecorder(
		t,
		string(types.HTTPVerbPost),
		"/api/users",
		&types.CreateUserRequest{
			Email:    "test@test.it",
			Password: "somepassword",
		},
	)

	config := apitest.LoadConfig(t)

	// create the existing user
	apitest.CreateTestUser(t, config, true)

	handler := user.NewUserCreateHandler(
		config,
		shared.NewDefaultRequestDecoderValidator(config),
		shared.NewDefaultResultWriter(config),
	)

	handler.ServeHTTP(rr, req)

	apitest.AssertResponseError(t, rr, http.StatusBadRequest, &types.ExternalError{
		Error: fmt.Sprintf("email already taken"),
	})
}

func TestFailingCreateUserMethod(t *testing.T) {
	req, rr := apitest.GetRequestAndRecorder(
		t,
		string(types.HTTPVerbPost),
		"/api/users",
		&types.CreateUserRequest{
			Email:    "test@test.it",
			Password: "somepassword",
		},
	)

	config := apitest.LoadConfig(t, test.CreateUserMethod)

	handler := user.NewUserCreateHandler(
		config,
		shared.NewDefaultRequestDecoderValidator(config),
		shared.NewDefaultResultWriter(config),
	)

	handler.ServeHTTP(rr, req)

	apitest.AssertResponseInternalServerError(t, rr)
}

func TestFailingCreateSessionMethod(t *testing.T) {
	req, rr := apitest.GetRequestAndRecorder(
		t,
		string(types.HTTPVerbPost),
		"/api/users",
		&types.CreateUserRequest{
			Email:    "test@test.it",
			Password: "somepassword",
		},
	)

	config := apitest.LoadConfig(t, test.CreateSessionMethod)

	handler := user.NewUserCreateHandler(
		config,
		shared.NewDefaultRequestDecoderValidator(config),
		shared.NewDefaultResultWriter(config),
	)

	handler.ServeHTTP(rr, req)

	apitest.AssertResponseInternalServerError(t, rr)
}
