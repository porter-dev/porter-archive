package registry

import (
	"fmt"
	"net/http"
	"net/url"

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
	reg, _ := r.Context().Value(types.RegistryScope).(*models.Registry)

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

	if regAPI.AWSIntegrationID != 0 {
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

		imgs, nextToken, err := regAPI.GetECRPaginatedImages(repoName, c.Repo(), request.Num, nextToken)

		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}

		if nextToken != nil {
			res.Next = url.QueryEscape(*nextToken)
		}

		res.Images = append(res.Images, imgs...)
	} else {
		imgs, err := regAPI.ListImages(repoName, c.Repo(), c.Config().DOConf)

		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}

		res.Images = append(res.Images, imgs...)
	}

	c.WriteResult(w, r, res)
}
