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

func TestLoginUserSuccessful(t *testing.T) {
	req, rr := apitest.GetRequestAndRecorder(
		t,
		string(types.HTTPVerbPost),
		"/api/users/login",
		&types.LoginUserRequest{
			Email:    "test@test.it",
			Password: "hello",
		},
	)

	config := apitest.LoadConfig(t)
	apitest.CreateTestUser(t, config)

	handler := user.NewUserLoginHandler(
		config,
		shared.NewDefaultRequestDecoderValidator(config),
		shared.NewDefaultResultWriter(config),
	)

	handler.ServeHTTP(rr, req)

	expUser := &types.LoginUserResponse{
		ID:            1,
		Email:         "test@test.it",
		EmailVerified: true,
	}

	gotUser := &types.LoginUserResponse{}

	apitest.AssertResponseExpected(t, rr, expUser, gotUser)
}

func TestLoginUserIncorrectPassword(t *testing.T) {
	req, rr := apitest.GetRequestAndRecorder(
		t,
		string(types.HTTPVerbPost),
		"/api/users/login",
		&types.LoginUserRequest{
			Email:    "test@test.it",
			Password: "hello1",
		},
	)

	config := apitest.LoadConfig(t)
	apitest.CreateTestUser(t, config)

	handler := user.NewUserLoginHandler(
		config,
		shared.NewDefaultRequestDecoderValidator(config),
		shared.NewDefaultResultWriter(config),
	)

	handler.ServeHTTP(rr, req)

	apitest.AssertResponseError(t, rr, http.StatusUnauthorized, &types.ExternalError{
		Error: fmt.Sprintf("incorrect password"),
	})
}

func TestLoginUserBadEmail(t *testing.T) {
	req, rr := apitest.GetRequestAndRecorder(
		t,
		string(types.HTTPVerbPost),
		"/api/users/login",
		&types.LoginUserRequest{
			Email:    "test",
			Password: "hello1",
		},
	)

	config := apitest.LoadConfig(t)
	apitest.CreateTestUser(t, config)

	handler := user.NewUserLoginHandler(
		config,
		shared.NewDefaultRequestDecoderValidator(config),
		shared.NewDefaultResultWriter(config),
	)

	handler.ServeHTTP(rr, req)

	apitest.AssertResponseError(t, rr, http.StatusBadRequest, &types.ExternalError{
		Error: fmt.Sprintf("validation failed on field 'Email' on condition 'email'"),
	})
}

func TestLoginUserEmptyPassword(t *testing.T) {
	req, rr := apitest.GetRequestAndRecorder(
		t,
		string(types.HTTPVerbPost),
		"/api/users/login",
		&types.LoginUserRequest{
			Email:    "test@test.it",
			Password: "",
		},
	)

	config := apitest.LoadConfig(t)
	apitest.CreateTestUser(t, config)

	handler := user.NewUserLoginHandler(
		config,
		shared.NewDefaultRequestDecoderValidator(config),
		shared.NewDefaultResultWriter(config),
	)

	handler.ServeHTTP(rr, req)

	apitest.AssertResponseError(t, rr, http.StatusBadRequest, &types.ExternalError{
		Error: fmt.Sprintf("validation failed on field 'Password' on condition 'required'"),
	})
}

func TestLoginUserNotExist(t *testing.T) {
	req, rr := apitest.GetRequestAndRecorder(
		t,
		string(types.HTTPVerbPost),
		"/api/users/login",
		&types.LoginUserRequest{
			Email:    "test@example.com",
			Password: "hello",
		},
	)

	config := apitest.LoadConfig(t)
	apitest.CreateTestUser(t, config)

	handler := user.NewUserLoginHandler(
		config,
		shared.NewDefaultRequestDecoderValidator(config),
		shared.NewDefaultResultWriter(config),
	)

	handler.ServeHTTP(rr, req)

	apitest.AssertResponseForbidden(t, rr)
}

func TestLoginUserFailingReadUserByEmailMethod(t *testing.T) {
	req, rr := apitest.GetRequestAndRecorder(
		t,
		string(types.HTTPVerbPost),
		"/api/users/login",
		&types.LoginUserRequest{
			Email:    "test@test.it",
			Password: "hello",
		},
	)

	config := apitest.LoadConfig(t, test.ReadUserByEmailMethod)
	apitest.CreateTestUser(t, config)

	handler := user.NewUserLoginHandler(
		config,
		shared.NewDefaultRequestDecoderValidator(config),
		shared.NewDefaultResultWriter(config),
	)

	handler.ServeHTTP(rr, req)

	apitest.AssertResponseInternalServerError(t, rr)
}
