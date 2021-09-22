package registry

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type RegistryUpdateHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewRegistryUpdateHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *RegistryUpdateHandler {
	return &RegistryUpdateHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (p *RegistryUpdateHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	reg, _ := r.Context().Value(types.RegistryScope).(*models.Registry)

	request := &types.UpdateRegistryRequest{}

	ok := p.DecodeAndValidate(w, r, request)

	if !ok {
		return
	}

	reg.Name = request.Name

	reg, err := p.Repo().Registry().UpdateRegistry(reg)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	p.WriteResult(w, r, reg.ToRegistryType())
}
