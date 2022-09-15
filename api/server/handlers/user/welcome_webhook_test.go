package user_test

import (
	"io"
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/porter-dev/porter/api/server/handlers/user"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apitest"
	"github.com/porter-dev/porter/api/types"
)

func TestWelcomeWebhookWithoutURL(t *testing.T) {
	req, rr := apitest.GetRequestAndRecorder(
		t,
		string(types.HTTPVerbPost),
		"/api/welcome",
		&types.WelcomeWebhookRequest{
			Email:     "test@test.it",
			IsCompany: true,
			Company:   "Awesome Company",
			Role:      "Founder",
			Name:      "John Doe",
		},
	)

	config := apitest.LoadConfig(t)
	config.ServerConf.WelcomeFormWebhook = ""

	handler := user.NewUserWelcomeHandler(
		config,
		shared.NewDefaultRequestDecoderValidator(config.Logger, config.Alerter),
		shared.NewDefaultResultWriter(config.Logger, config.Alerter),
	)

	handler.ServeHTTP(rr, req)

	assert.Equal(t, rr.Result().StatusCode, 200, "incorrect status code")
}

func helloWebhook(w http.ResponseWriter, r *http.Request) {
	io.WriteString(w, "Hello!\n")
}

func TestWelcomeWebhookWithURL(t *testing.T) {
	req, rr := apitest.GetRequestAndRecorder(
		t,
		string(types.HTTPVerbPost),
		"/api/welcome",
		&types.WelcomeWebhookRequest{
			Email:     "test@test.it",
			IsCompany: true,
			Company:   "Awesome Company",
			Role:      "Founder",
			Name:      "John Doe",
		},
	)

	go func() {
		http.HandleFunc("/hello", helloWebhook)
		http.ListenAndServe(":10044", nil)
	}()

	config := apitest.LoadConfig(t)
	config.ServerConf.WelcomeFormWebhook = "http://localhost:10044/hello"

	handler := user.NewUserWelcomeHandler(
		config,
		shared.NewDefaultRequestDecoderValidator(config.Logger, config.Alerter),
		shared.NewDefaultResultWriter(config.Logger, config.Alerter),
	)

	handler.ServeHTTP(rr, req)

	assert.Equal(t, rr.Result().StatusCode, 200, "incorrect status code")
}
