package registry

import (
	"net/http"
	"strings"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/registry"
)

type RegistryCreateRepositoryHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewRegistryCreateRepositoryHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *RegistryCreateRepositoryHandler {
	return &RegistryCreateRepositoryHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (p *RegistryCreateRepositoryHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	reg, _ := r.Context().Value(types.RegistryScope).(*models.Registry)

	request := &types.CreateRegistryRepositoryRequest{}

	ok := p.DecodeAndValidate(w, r, request)

	if !ok {
		return
	}

	_reg := registry.Registry(*reg)
	regAPI := &_reg

	// parse the name from the registry
	nameSpl := strings.Split(request.ImageRepoURI, "/")
	repoName := strings.ToLower(strings.ReplaceAll(nameSpl[len(nameSpl)-1], "_", "-"))

	err := regAPI.CreateRepository(p.Repo(), repoName)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}
}
