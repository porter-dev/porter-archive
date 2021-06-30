package user_test

import (
	"fmt"
	"net/url"
	"testing"

	"github.com/porter-dev/porter/api/server/handlers/user"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apitest"
	"github.com/porter-dev/porter/api/types"
	"github.com/stretchr/testify/assert"
	"golang.org/x/crypto/bcrypt"
)

func TestEmailVerifyInitiateSuccessful(t *testing.T) {
	config := apitest.LoadConfig(t)
	authUser := apitest.CreateTestUser(t, config, true)
	req, rr := apitest.GetRequestAndRecorder(t, string(types.HTTPVerbPost), "/api/email/verify/initiate", nil)

	req = apitest.WithAuthenticatedUser(t, req, authUser)

	handler := user.NewVerifyEmailInitiateHandler(config)

	handler.ServeHTTP(rr, req)

	// check the notifier data from config by casting to a fake notifier object
	fakeNotifier, ok := config.UserNotifier.(*apitest.FakeUserNotifier)

	if !ok {
		t.Fatal("Could not cast user notifier to fake notifier")
	}

	initiateOpts := fakeNotifier.GetSendEmailVerificationLastOpts()
	assert.Equal(t, "test@test.it", initiateOpts.Email)

	// parse the url and compare
	parsedURL, err := url.Parse(initiateOpts.URL)

	if err != nil {
		t.Fatal(err)
	}

	// read token from the DB
	token, err := config.Repo.PWResetToken().ReadPWResetToken(1)

	if err != nil {
		t.Fatal(err)
	}

	assert.Equal(t, "/api/email/verify/finalize", parsedURL.Path)
	vals := parsedURL.Query()

	assert.True(t, bcrypt.CompareHashAndPassword([]byte(token.Token), []byte(vals["token"][0])) == nil)
	assert.Equal(t, "1", vals["token_id"][0])
}

func TestEmailVerifyFinalizeSuccessful(t *testing.T) {
	config := apitest.LoadConfig(t)
	authUser := apitest.CreateTestUser(t, config, false)

	// create a token in the DB to use for testing
	pwReset, rawToken, err := user.CreateTokenForEmail(config, authUser.Email)

	if err != nil {
		t.Fatal(err)
	}

	req, rr := apitest.GetRequestAndRecorder(
		t,
		string(types.HTTPVerbGet),
		"/api/email/verify/finalize?"+url.Values{
			"token_id": []string{fmt.Sprintf("%d", pwReset.ID)},
			"token":    []string{rawToken},
		}.Encode(),
		nil,
	)

	req = apitest.WithAuthenticatedUser(t, req, authUser)

	handler := user.NewVerifyEmailFinalizeHandler(
		config,
		shared.NewDefaultRequestDecoderValidator(config),
	)

	handler.ServeHTTP(rr, req)

	// read the user and check that their email has been verified
	authUser, err = config.Repo.User().ReadUser(authUser.ID)

	assert.True(t, authUser.EmailVerified)
}
