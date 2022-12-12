package registry

import (
	"encoding/base64"
	"net/http"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/service/ecr"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/oauth"
	"github.com/porter-dev/porter/internal/registry"

	"github.com/aws/aws-sdk-go-v2/aws/arn"
)

type RegistryGetECRTokenHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewRegistryGetECRTokenHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *RegistryGetECRTokenHandler {
	return &RegistryGetECRTokenHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *RegistryGetECRTokenHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	request := &types.GetRegistryECRTokenRequest{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	// list registries and find one that matches the region
	regs, err := c.Repo().Registry().ListRegistriesByProjectID(proj.ID)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	var token string
	var expiresAt *time.Time

	for _, reg := range regs {
		if reg.AWSIntegrationID != 0 {
			awsInt, err := c.Repo().AWSIntegration().ReadAWSIntegration(reg.ProjectID, reg.AWSIntegrationID)

			if err != nil {
				c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
				return
			}

			// if the aws integration doesn't have an ARN populated, populate it
			if awsInt.AWSArn == "" {
				err = awsInt.PopulateAWSArn(ctx)

				if err != nil {
					continue
				}
			}

			parsedARN, err := arn.Parse(awsInt.AWSArn)

			if err != nil {
				continue
			}

			// if the account id is passed as part of the request, verify the account id matches the account id in the ARN
			if awsInt.AWSRegion == request.Region && (request.AccountID == "" || request.AccountID == parsedARN.AccountID) {
				// get the aws integration and session
				ecrSvc := ecr.NewFromConfig(awsInt.Config())

				output, err := ecrSvc.GetAuthorizationToken(ctx, &ecr.GetAuthorizationTokenInput{})

				if err != nil {
					c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
					return
				}

				token = *output.AuthorizationData[0].AuthorizationToken
				expiresAt = output.AuthorizationData[0].ExpiresAt
			}
		}
	}

	resp := &types.GetRegistryTokenResponse{
		Token:     token,
		ExpiresAt: expiresAt,
	}

	c.WriteResult(w, r, resp)
}

type RegistryGetGCRTokenHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewRegistryGetGCRTokenHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *RegistryGetGCRTokenHandler {
	return &RegistryGetGCRTokenHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *RegistryGetGCRTokenHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	request := &types.GetRegistryGCRTokenRequest{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	// list registries and find one that matches the region
	regs, err := c.Repo().Registry().ListRegistriesByProjectID(proj.ID)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	var token string
	var expiresAt *time.Time

	for _, reg := range regs {
		if reg.GCPIntegrationID != 0 && strings.Contains(reg.URL, request.ServerURL) {
			_reg := registry.Registry(*reg)

			oauthTok, err := _reg.GetGCRToken(c.Repo())

			// if the oauth token is not nil, but the error is not nil, we still return the token
			// but log an error
			if oauthTok != nil && err != nil {
				c.HandleAPIErrorNoWrite(w, r, apierrors.NewErrInternal(err))
			} else if err != nil {
				c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
				return
			}

			token = oauthTok.AccessToken
			expiresAt = &oauthTok.Expiry
			break
		}
	}

	resp := &types.GetRegistryTokenResponse{
		Token:     token,
		ExpiresAt: expiresAt,
	}

	c.WriteResult(w, r, resp)
}

type RegistryGetGARTokenHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewRegistryGetGARTokenHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *RegistryGetGARTokenHandler {
	return &RegistryGetGARTokenHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *RegistryGetGARTokenHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	request := &types.GetRegistryGCRTokenRequest{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	// list registries and find one that matches the region
	regs, err := c.Repo().Registry().ListRegistriesByProjectID(proj.ID)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	var token string
	var expiresAt *time.Time

	for _, reg := range regs {
		if reg.GCPIntegrationID != 0 && strings.Contains(reg.URL, request.ServerURL) {
			_reg := registry.Registry(*reg)

			oauthTok, err := _reg.GetGARToken(c.Repo())

			// if the oauth token is not nil, but the error is not nil, we still return the token
			// but log an error
			if oauthTok != nil && err != nil {
				c.HandleAPIErrorNoWrite(w, r, apierrors.NewErrInternal(err))
			} else if err != nil {
				c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
				return
			}

			token = oauthTok.AccessToken
			expiresAt = &oauthTok.Expiry
			break
		}
	}

	resp := &types.GetRegistryTokenResponse{
		Token:     token,
		ExpiresAt: expiresAt,
	}

	c.WriteResult(w, r, resp)
}

type RegistryGetDOCRTokenHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewRegistryGetDOCRTokenHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *RegistryGetDOCRTokenHandler {
	return &RegistryGetDOCRTokenHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *RegistryGetDOCRTokenHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	request := &types.GetRegistryDOCRTokenRequest{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	// list registries and find one that matches the region
	regs, err := c.Repo().Registry().ListRegistriesByProjectID(proj.ID)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	var token string
	var expiresAt *time.Time

	for _, reg := range regs {
		if reg.DOIntegrationID != 0 && strings.Contains(reg.URL, request.ServerURL) {
			oauthInt, err := c.Repo().OAuthIntegration().ReadOAuthIntegration(reg.ProjectID, reg.DOIntegrationID)

			if err != nil {
				c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
				return
			}

			tok, expiry, err := oauth.GetAccessToken(
				oauthInt.SharedOAuthModel,
				c.Config().DOConf,
				oauth.MakeUpdateOAuthIntegrationTokenFunction(oauthInt, c.Repo()),
			)

			if err != nil {
				c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
				return
			}

			token = tok
			expiresAt = expiry
			break
		}
	}

	resp := &types.GetRegistryTokenResponse{
		Token:     token,
		ExpiresAt: expiresAt,
	}

	c.WriteResult(w, r, resp)
}

type RegistryGetDockerhubTokenHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewRegistryGetDockerhubTokenHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *RegistryGetDockerhubTokenHandler {
	return &RegistryGetDockerhubTokenHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *RegistryGetDockerhubTokenHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	// list registries and find one that matches the region
	regs, err := c.Repo().Registry().ListRegistriesByProjectID(proj.ID)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	var token string
	var expiresAt *time.Time

	for _, reg := range regs {
		if reg.BasicIntegrationID != 0 && strings.Contains(reg.URL, "index.docker.io") {
			basic, err := c.Repo().BasicIntegration().ReadBasicIntegration(reg.ProjectID, reg.BasicIntegrationID)

			if err != nil {
				c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
				return
			}

			token = base64.StdEncoding.EncodeToString([]byte(string(basic.Username) + ":" + string(basic.Password)))

			// we'll just set an arbitrary 30-day expiry time (this is not enforced)
			timeExpires := time.Now().Add(30 * 24 * 3600 * time.Second)
			expiresAt = &timeExpires
		}
	}

	resp := &types.GetRegistryTokenResponse{
		Token:     token,
		ExpiresAt: expiresAt,
	}

	c.WriteResult(w, r, resp)
}

type RegistryGetACRTokenHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewRegistryGetACRTokenHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *RegistryGetACRTokenHandler {
	return &RegistryGetACRTokenHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *RegistryGetACRTokenHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	// list registries and find one that matches the region
	regs, err := c.Repo().Registry().ListRegistriesByProjectID(proj.ID)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	var token string
	var expiresAt *time.Time

	for _, reg := range regs {
		if reg.AzureIntegrationID != 0 && strings.Contains(reg.URL, "azurecr.io") {
			_reg := registry.Registry(*reg)

			username, pw, err := _reg.GetACRCredentials(c.Repo())

			if err != nil {
				continue
			}

			token = base64.StdEncoding.EncodeToString([]byte(string(username) + ":" + string(pw)))

			// we'll just set an arbitrary 30-day expiry time (this is not enforced)
			timeExpires := time.Now().Add(30 * 24 * 3600 * time.Second)
			expiresAt = &timeExpires
		}
	}

	resp := &types.GetRegistryTokenResponse{
		Token:     token,
		ExpiresAt: expiresAt,
	}

	c.WriteResult(w, r, resp)
}
