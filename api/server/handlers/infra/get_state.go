package infra

import (
	"context"
	"errors"
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/provisioner/client"
)

type InfraGetStateHandler struct {
	handlers.PorterHandlerWriter
}

func NewInfraGetStateHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *InfraGetStateHandler {
	return &InfraGetStateHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (c *InfraGetStateHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)
	infra, _ := r.Context().Value(types.InfraScope).(*models.Infra)

	// call apply on the provisioner service
	resp, err := c.Config().ProvisionerClient.GetState(context.Background(), proj.ID, infra.ID)
	if err != nil {
		if errors.Is(err, client.ErrDoesNotExist) {
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusNotFound))
			return
		}

		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	c.WriteResult(w, r, resp)
}
