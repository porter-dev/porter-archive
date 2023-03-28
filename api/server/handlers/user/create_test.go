package user_test

import (
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
			FirstName:   "Mister",
			LastName:    "Porter",
			CompanyName: "Porter Technologies, Inc.",
			Email:       "mrp@porter.run",
			Password:    "somepassword",
		},
	)

	config := apitest.LoadConfig(t)

	handler := user.NewUserCreateHandler(
		config,
		shared.NewDefaultRequestDecoderValidator(config.Logger, config.Alerter),
		shared.NewDefaultResultWriter(config.Logger, config.Alerter),
	)

	handler.ServeHTTP(rr, req)

	expUser := &types.CreateUserResponse{
		ID:            1,
		FirstName:     "Mister",
		LastName:      "Porter",
		CompanyName:   "Porter Technologies, Inc.",
		Email:         "mrp@porter.run",
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
			FirstName:   "Mister",
			LastName:    "Porter",
			CompanyName: "Porter Technologies, Inc.",
			Email:       "notanemail",
			Password:    "somepassword",
		},
	)

	config := apitest.LoadConfig(t)

	handler := user.NewUserCreateHandler(
		config,
		shared.NewDefaultRequestDecoderValidator(config.Logger, config.Alerter),
		shared.NewDefaultResultWriter(config.Logger, config.Alerter),
	)

	handler.ServeHTTP(rr, req)

	apitest.AssertResponseError(t, rr, http.StatusBadRequest, &types.ExternalError{
		Error: "validation failed on field 'Email' on condition 'email'",
	})
}

func TestCreateUserMissingField(t *testing.T) {
	req, rr := apitest.GetRequestAndRecorder(
		t,
		string(types.HTTPVerbPost),
		"/api/users",
		&types.CreateUserRequest{
			FirstName:   "Mister",
			LastName:    "Porter",
			CompanyName: "Porter Technologies, Inc.",
			Email:       "mrp@porter.run",
		},
	)

	config := apitest.LoadConfig(t)

	handler := user.NewUserCreateHandler(
		config,
		shared.NewDefaultRequestDecoderValidator(config.Logger, config.Alerter),
		shared.NewDefaultResultWriter(config.Logger, config.Alerter),
	)

	handler.ServeHTTP(rr, req)

	apitest.AssertResponseError(t, rr, http.StatusBadRequest, &types.ExternalError{
		Error: "validation failed on field 'Password' on condition 'required'",
	})
}

func TestCreateUserSameEmail(t *testing.T) {
	req, rr := apitest.GetRequestAndRecorder(
		t,
		string(types.HTTPVerbPost),
		"/api/users",
		&types.CreateUserRequest{
			FirstName:   "Mister",
			LastName:    "Porter",
			CompanyName: "Porter Technologies, Inc.",
			Email:       "mrp@porter.run",
			Password:    "somepassword",
		},
	)

	config := apitest.LoadConfig(t)

	// create the existing user
	apitest.CreateTestUser(t, config, true)

	handler := user.NewUserCreateHandler(
		config,
		shared.NewDefaultRequestDecoderValidator(config.Logger, config.Alerter),
		shared.NewDefaultResultWriter(config.Logger, config.Alerter),
	)

	handler.ServeHTTP(rr, req)

	apitest.AssertResponseError(t, rr, http.StatusBadRequest, &types.ExternalError{
		Error: "email already taken",
	})
}

func TestFailingCreateUserMethod(t *testing.T) {
	req, rr := apitest.GetRequestAndRecorder(
		t,
		string(types.HTTPVerbPost),
		"/api/users",
		&types.CreateUserRequest{
			FirstName:   "Mister",
			LastName:    "Porter",
			CompanyName: "Porter Technologies, Inc.",
			Email:       "mrp@porter.run",
			Password:    "somepassword",
		},
	)

	config := apitest.LoadConfig(t, test.CreateUserMethod)

	handler := user.NewUserCreateHandler(
		config,
		shared.NewDefaultRequestDecoderValidator(config.Logger, config.Alerter),
		shared.NewDefaultResultWriter(config.Logger, config.Alerter),
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
			FirstName:   "Mister",
			LastName:    "Porter",
			CompanyName: "Porter Technologies, Inc.",
			Email:       "mrp@porter.run",
			Password:    "somepassword",
		},
	)

	config := apitest.LoadConfig(t, test.CreateSessionMethod)

	handler := user.NewUserCreateHandler(
		config,
		shared.NewDefaultRequestDecoderValidator(config.Logger, config.Alerter),
		shared.NewDefaultResultWriter(config.Logger, config.Alerter),
	)

	handler.ServeHTTP(rr, req)

	apitest.AssertResponseInternalServerError(t, rr)
}
