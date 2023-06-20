package registry

import (
	"encoding/base64"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/porter-dev/porter/internal/telemetry"

	"github.com/aws/aws-sdk-go/aws/arn"
	"github.com/aws/aws-sdk-go/service/ecr"
	"github.com/bufbuild/connect-go"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/oauth"
	"github.com/porter-dev/porter/internal/registry"
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
	proj, _ := ctx.Value(types.ProjectScope).(*models.Project)

	request := &types.GetRegistryECRTokenRequest{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	if proj.CapiProvisionerEnabled {
		ecrRequest := porterv1.ECRTokenForRegistryRequest{
			ProjectId:    int64(proj.ID),
			Region:       request.Region,
			AwsAccountId: request.AccountID,
		}
		ecrResponse, err := c.Config().ClusterControlPlaneClient.ECRTokenForRegistry(ctx, connect.NewRequest(&ecrRequest))
		if err != nil {
			e := fmt.Errorf("error getting ecr token for capi cluster: %v", err)
			c.HandleAPIError(w, r, apierrors.NewErrInternal(e))
			return
		}
		if ecrResponse.Msg == nil {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("nil message received for ecr token")))
			return
		}
		expiry := ecrResponse.Msg.Expiry.AsTime()

		resp := &types.GetRegistryTokenResponse{
			Token:     ecrResponse.Msg.Token,
			ExpiresAt: &expiry,
		}

		c.WriteResult(w, r, resp)
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
				err = awsInt.PopulateAWSArn()

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
				sess, err := awsInt.GetSession()
				if err != nil {
					c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
					return
				}

				ecrSvc := ecr.New(sess)

				output, err := ecrSvc.GetAuthorizationToken(&ecr.GetAuthorizationTokenInput{})
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
	ctx, span := telemetry.NewSpan(r.Context(), "serve-registry-get-gcr-token")
	defer span.End()

	proj, _ := ctx.Value(types.ProjectScope).(*models.Project)

	request := &types.GetRegistryGCRTokenRequest{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	// list registries and find one that matches the region
	regs, err := c.Repo().Registry().ListRegistriesByProjectID(proj.ID)
	if err != nil {
		e := telemetry.Error(ctx, span, err, "error listing registries by project id")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusInternalServerError))
		return
	}

	var token string
	var expiresAt *time.Time

	for _, reg := range regs {
		if reg.GCPIntegrationID != 0 && strings.Contains(reg.URL, request.ServerURL) {
			_reg := registry.Registry(*reg)

			oauthTok, err := _reg.GetGCRToken(ctx, c.Repo())
			if err != nil {
				// if the oauth token is not nil, we still return the token but log an error
				if oauthTok == nil {
					e := telemetry.Error(ctx, span, err, "error getting gcr token")
					c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusInternalServerError))
					return
				}
				e := telemetry.Error(ctx, span, err, "error getting gcr token, but token was returned")
				c.HandleAPIErrorNoWrite(w, r, apierrors.NewErrInternal(e))
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
	ctx, span := telemetry.NewSpan(r.Context(), "serve-registry-get-gar-token")
	defer span.End()

	proj, _ := ctx.Value(types.ProjectScope).(*models.Project)

	request := &types.GetRegistryGCRTokenRequest{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	// list registries and find one that matches the region
	regs, err := c.Repo().Registry().ListRegistriesByProjectID(proj.ID)
	if err != nil {
		e := telemetry.Error(ctx, span, err, "error listing registries by project id")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusInternalServerError))
		return
	}

	var token string
	var expiresAt *time.Time

	for _, reg := range regs {
		if reg.GCPIntegrationID != 0 && strings.Contains(reg.URL, request.ServerURL) {
			_reg := registry.Registry(*reg)

			oauthTok, err := _reg.GetGARToken(ctx, c.Repo())
			if err != nil {
				// if the oauth token is not nil, we still return the token but log an error
				if oauthTok == nil {
					e := telemetry.Error(ctx, span, err, "error getting gar token")
					c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusInternalServerError))
					return
				}
				e := telemetry.Error(ctx, span, err, "error getting gar token, but token was returned")
				c.HandleAPIErrorNoWrite(w, r, apierrors.NewErrInternal(e))
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
	ctx, span := telemetry.NewSpan(r.Context(), "serve-acr-token")
	defer span.End()

	proj, _ := ctx.Value(types.ProjectScope).(*models.Project)

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "project-id", Value: proj.ID})

	request := &types.GetRegistryACRTokenRequest{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		err := telemetry.Error(ctx, span, nil, "error decoding request")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	if request.ServerURL == "" {
		err := telemetry.Error(ctx, span, nil, "missing server url")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	// list registries and find one that matches the region
	regs, err := c.Repo().Registry().ListRegistriesByProjectID(proj.ID)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error getting registries by project id")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	var token string
	var expiresAt *time.Time

	for _, reg := range regs {
		if strings.Contains(reg.URL, request.ServerURL) {
			telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "registry-name", Value: reg.Name})

			if proj.CapiProvisionerEnabled {
				telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "capi-provisioned", Value: true})

				tokenReq := connect.NewRequest(&porterv1.TokenForRegistryRequest{
					ProjectId:   int64(proj.ID),
					RegistryUri: reg.URL,
				})
				tokenResp, err := c.Config().ClusterControlPlaneClient.TokenForRegistry(ctx, tokenReq)
				if err != nil {
					err := telemetry.Error(ctx, span, err, "error getting token response from ccp")
					c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
					return
				}

				if tokenResp.Msg == nil || tokenResp.Msg.Token == "" {
					err := telemetry.Error(ctx, span, nil, "no token found in response")
					c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
					return
				}

				token = tokenResp.Msg.Token

				// we'll just set an arbitrary 30-day expiry time (this is not enforced)
				timeExpires := time.Now().Add(30 * 24 * 3600 * time.Second)
				expiresAt = &timeExpires
			} else if reg.AzureIntegrationID != 0 {
				telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "capi-provisioned", Value: false})

				_reg := registry.Registry(*reg)
				username, pw, err := _reg.GetACRCredentials(c.Repo())
				if err != nil {
					c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
					continue
				}

				token = base64.StdEncoding.EncodeToString([]byte(string(username) + ":" + string(pw)))
				// we'll just set an arbitrary 30-day expiry time (this is not enforced)
				timeExpires := time.Now().Add(30 * 24 * 3600 * time.Second)
				expiresAt = &timeExpires
			}
		}
	}

	if token == "" {
		err := telemetry.Error(ctx, span, nil, "missing token")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	resp := &types.GetRegistryTokenResponse{
		Token:     token,
		ExpiresAt: expiresAt,
	}

	c.WriteResult(w, r, resp)
}
