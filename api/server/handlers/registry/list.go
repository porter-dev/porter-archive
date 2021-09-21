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

type RegistryListHandler struct {
	handlers.PorterHandlerWriter
}

func NewRegistryListHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *RegistryListHandler {
	return &RegistryListHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (c *RegistryListHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	regs, err := c.Repo().Registry().ListRegistriesByProjectID(proj.ID)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	extRegs := make(types.RegistryListResponse, 0)

	for _, reg := range regs {
		extRegs = append(extRegs, *reg.ToRegistryType())
	}

	c.WriteResult(w, r, extRegs)
}
