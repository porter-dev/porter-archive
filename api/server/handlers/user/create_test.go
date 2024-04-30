package user_test

import (
	"encoding/json"
	"net/http"
	"testing"

	"github.com/porter-dev/porter/api/server/handlers/user"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apitest"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/repository/test"
	"github.com/stretchr/testify/assert"
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

	// Use a struct that is the same as types.User but without the
	// referral fields. This is because the referral code is randomly
	// generated and is tested separately.
	expUser := &struct {
		ID            uint   `json:"id"`
		Email         string `json:"email"`
		EmailVerified bool   `json:"email_verified"`
		FirstName     string `json:"first_name"`
		LastName      string `json:"last_name"`
		CompanyName   string `json:"company_name"`
	}{
		ID:            1,
		FirstName:     "Mister",
		LastName:      "Porter",
		CompanyName:   "Porter Technologies, Inc.",
		Email:         "mrp@porter.run",
		EmailVerified: false,
	}

	gotUser := &struct {
		ID            uint   `json:"id"`
		Email         string `json:"email"`
		EmailVerified bool   `json:"email_verified"`
		FirstName     string `json:"first_name"`
		LastName      string `json:"last_name"`
		CompanyName   string `json:"company_name"`
	}{}

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

func TestCreateUserReferralCode(t *testing.T) {
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
	gotUser := &types.CreateUserResponse{}

	// apitest.AssertResponseExpected(t, rr, expUser, gotUser)
	err := json.NewDecoder(rr.Body).Decode(gotUser)
	if err != nil {
		t.Fatal(err)
	}

	// This is the default lenth of a shortuuid
	desiredLenth := 22
	assert.NotEmpty(t, gotUser.ReferralCode, "referral code should not be empty")
	assert.Len(t, gotUser.ReferralCode, desiredLenth, "referral code should be 20 characters long")
	assert.Equal(t, gotUser.ReferralRewardClaimed, false, "referral reward claimed should be false for new user")
}
