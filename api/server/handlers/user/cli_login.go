package user

import (
	"fmt"
	"net/http"
	"net/url"
	"time"

	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/auth/token"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
)

type CLILoginHandler struct {
	config           *shared.Config
	decoderValidator shared.RequestDecoderValidator
	writer           shared.ResultWriter
}

func NewCLILoginHandler(
	config *shared.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *CLILoginHandler {
	return &CLILoginHandler{config, decoderValidator, writer}
}

func (c *CLILoginHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	request := &types.CLILoginUserRequest{}

	ok := c.decoderValidator.DecodeAndValidate(w, r, request)

	if !ok {
		return
	}

	user, _ := r.Context().Value(types.UserScope).(*models.User)

	// generate the token
	jwt, err := token.GetTokenForUser(user.ID)

	if err != nil {
		apierrors.HandleAPIError(
			w,
			c.config.Logger,
			apierrors.NewErrInternal(
				fmt.Errorf("CLI token creation failed: %s", err.Error()),
			),
		)

		return
	}

	encoded, err := jwt.EncodeToken(&token.TokenGeneratorConf{
		TokenSecret: c.config.ServerConf.TokenGeneratorSecret,
	})

	if err != nil {
		apierrors.HandleAPIError(
			w,
			c.config.Logger,
			apierrors.NewErrInternal(
				fmt.Errorf("CLI token encoding failed: %s", err.Error()),
			),
		)

		return
	}

	// generate 64 characters long authorization code
	code, err := repository.GenerateRandomBytes(32)

	if err != nil {
		apierrors.HandleAPIError(
			w,
			c.config.Logger,
			apierrors.NewErrInternal(
				fmt.Errorf("CLI random code generation failed: %s", err.Error()),
			),
		)

		return
	}

	expiry := time.Now().Add(30 * time.Second)

	// create auth code object and send back authorization code
	authCode := &models.AuthCode{
		Token:             encoded,
		AuthorizationCode: code,
		Expiry:            &expiry,
	}

	authCode, err = c.config.Repo.AuthCode().CreateAuthCode(authCode)

	if err != nil {
		apierrors.HandleAPIError(
			w,
			c.config.Logger,
			apierrors.NewErrInternal(err),
		)

		return
	}

	http.Redirect(w, r, fmt.Sprintf("%s/?code=%s", request.Redirect, url.QueryEscape(authCode.AuthorizationCode)), 302)
}

type CLILoginExchangeHandler struct {
	config           *shared.Config
	decoderValidator shared.RequestDecoderValidator
	writer           shared.ResultWriter
}

func NewCLILoginExchangeHandler(
	config *shared.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *CLILoginExchangeHandler {
	return &CLILoginExchangeHandler{config, decoderValidator, writer}
}

func (c *CLILoginExchangeHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	request := &types.CLILoginExchangeRequest{}

	ok := c.decoderValidator.DecodeAndValidate(w, r, request)

	if !ok {
		return
	}

	// look up the auth code and exchange it for a token
	authCode, err := c.config.Repo.AuthCode().ReadAuthCode(request.AuthorizationCode)

	if err != nil || authCode.IsExpired() {
		http.Error(w, http.StatusText(http.StatusForbidden), http.StatusForbidden)
		return
	}

	res := &types.CLILoginExchangeResponse{
		Token: authCode.Token,
	}

	c.writer.WriteResult(w, res)
}
