package infra

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/ee/integrations/httpbackend"
	"github.com/porter-dev/porter/internal/models"
)

type InfraGetDesiredHandler struct {
	handlers.PorterHandlerWriter
}

func NewInfraGetDesiredHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *InfraGetDesiredHandler {
	return &InfraGetDesiredHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (c *InfraGetDesiredHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	infra, _ := r.Context().Value(types.InfraScope).(*models.Infra)

	// TODO: move client out of this call
	client := httpbackend.NewClient(c.Config().ServerConf.ProvisionerBackendURL)

	// get the unique infra name and query from the TF HTTP backend
	desired, err := client.GetDesiredState(infra.GetUniqueName())

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	c.WriteResult(w, r, desired)
}
