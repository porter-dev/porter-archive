package registry

import (
	"fmt"
	"net/http"
	strings "strings"

	"connectrpc.com/connect"

	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	ints "github.com/porter-dev/porter/internal/models/integrations"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/registry"
)

type RegistryListImagesHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewRegistryListImagesHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *RegistryListImagesHandler {
	return &RegistryListImagesHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *RegistryListImagesHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	project, _ := ctx.Value(types.ProjectScope).(*models.Project)
	reg, _ := ctx.Value(types.RegistryScope).(*models.Registry)

	repoName, reqErr := requestutils.GetURLParamString(r, types.URLParamWildcard)

	if reqErr != nil {
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(reqErr, http.StatusBadRequest))
		return
	}

	request := &types.V1ListImageRequest{}

	ok := c.DecodeAndValidate(w, r, request)

	if !ok {
		return
	}

	res := &types.V1ListImageResponse{}

	// cast to a registry from registry package
	_reg := registry.Registry(*reg)
	regAPI := &_reg

	if request.Num == 0 {
		request.Num = 1000
	} else if request.Num < 1 || request.Num > 1000 {
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
			fmt.Errorf("num should be between 1 and 1000 for ECR images"), http.StatusBadRequest,
		))
		return
	}

	var nextToken *string
	if request.Next != "" {
		nextToken = &request.Next
	}

	if project.GetFeatureFlag(models.CapiProvisionerEnabled, c.Config().LaunchDarklyClient) {
		uri := strings.TrimPrefix(regAPI.URL, "https://")
		splits := strings.Split(uri, ".")
		accountID := splits[0]
		region := splits[3]
		req := connect.NewRequest(&porterv1.AssumeRoleCredentialsRequest{
			ProjectId:    int64(regAPI.ProjectID),
			AwsAccountId: accountID,
		})
		creds, err := c.Config().ClusterControlPlaneClient.AssumeRoleCredentials(ctx, req)
		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}
		aws := &ints.AWSIntegration{
			AWSAccessKeyID:     []byte(creds.Msg.AwsAccessId),
			AWSSecretAccessKey: []byte(creds.Msg.AwsSecretKey),
			AWSSessionToken:    []byte(creds.Msg.AwsSessionToken),
			AWSRegion:          region,
		}

		imgs, nextToken, err := regAPI.GetECRPaginatedImages(repoName, request.Num, nextToken, aws)
		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}

		if nextToken != nil {
			res.Next = *nextToken
		}

		res.Images = append(res.Images, imgs...)
	} else if regAPI.AWSIntegrationID != 0 {
		aws, err := c.Repo().AWSIntegration().ReadAWSIntegration(
			regAPI.ProjectID,
			regAPI.AWSIntegrationID,
		)
		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}

		imgs, nextToken, err := regAPI.GetECRPaginatedImages(repoName, request.Num, nextToken, aws)
		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}

		if nextToken != nil {
			res.Next = *nextToken
		}

		res.Images = append(res.Images, imgs...)
	} else {
		imgs, err := regAPI.ListImages(ctx, repoName, c.Repo(), c.Config())
		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}

		res.Images = append(res.Images, imgs...)
	}

	c.WriteResult(w, r, res)
}
