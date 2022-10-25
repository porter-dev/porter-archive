package registry

import (
	"fmt"
	"net/http"
	"strings"

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
	handlers.PorterHandlerWriter
}

func NewRegistryListImagesHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *RegistryListImagesHandler {
	return &RegistryListImagesHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (c *RegistryListImagesHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	reg, _ := r.Context().Value(types.RegistryScope).(*models.Registry)

	repoName, _ := requestutils.GetURLParamString(r, types.URLParamWildcard)

	// cast to a registry from registry package
	_reg := registry.Registry(*reg)
	regAPI := &_reg

	imgs, err := regAPI.ListImages(repoName, c.Repo(), c.Config().DOConf)

	if err != nil && strings.Contains(err.Error(), "RepositoryNotFoundException") {
		c.HandleAPIError(w, r, apierrors.NewErrNotFound(fmt.Errorf("no such repository: %s", repoName)))
		return
	} else if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	c.WriteResult(w, r, imgs)
}
