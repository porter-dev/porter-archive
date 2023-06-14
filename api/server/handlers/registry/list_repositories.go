package registry

import (
	"net/http"

	"github.com/porter-dev/porter/internal/telemetry"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/registry"
)

type RegistryListRepositoriesHandler struct {
	handlers.PorterHandlerWriter
}

func NewRegistryListRepositoriesHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *RegistryListRepositoriesHandler {
	return &RegistryListRepositoriesHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (c *RegistryListRepositoriesHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-registry-list-repositories")
	defer span.End()

	reg, _ := ctx.Value(types.RegistryScope).(*models.Registry)

	// cast to a registry from registry package
	_reg := registry.Registry(*reg)
	regAPI := &_reg

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "registry-name", Value: regAPI.Name},
		telemetry.AttributeKV{Key: "registry-id", Value: regAPI.ID},
		telemetry.AttributeKV{Key: "project-id", Value: regAPI.ProjectID},
	)

	repos, err := regAPI.ListRepositories(ctx, c.Repo(), c.Config())
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error listing repositories")
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	c.WriteResult(w, r, repos)
}
