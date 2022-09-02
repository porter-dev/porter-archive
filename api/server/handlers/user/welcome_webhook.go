package user

import (
	"net/http"
	"net/url"

	"github.com/gorilla/schema"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
)

type UserWelcomeHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewUserWelcomeHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *UserWelcomeHandler {
	return &UserWelcomeHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (u *UserWelcomeHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Skip if no welcome hook is configured.
	welcomeFormWebhook := u.Config().ServerConf.WelcomeFormWebhook
	if welcomeFormWebhook == "" {
		return
	}

	reqVals := &types.WelcomeWebhookRequest{}

	if ok := u.DecodeAndValidate(w, r, reqVals); !ok {
		return
	}

	req, err := http.NewRequest("GET", welcomeFormWebhook, nil)
	if err != nil {
		return
	}

	encoder := schema.NewEncoder()
	dst := make(url.Values)

	if err := encoder.Encode(reqVals, dst); err != nil {
		u.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	req.URL.RawQuery = dst.Encode()
	_, err = http.Get(req.URL.String())

	if err != nil {
		u.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}
}
