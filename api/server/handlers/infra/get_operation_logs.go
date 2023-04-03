package infra

import (
	"context"
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type InfraGetOperationLogsHandler struct {
	handlers.PorterHandlerWriter
}

func NewInfraGetOperationLogsHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *InfraGetOperationLogsHandler {
	return &InfraGetOperationLogsHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (c *InfraGetOperationLogsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	infra, _ := r.Context().Value(types.InfraScope).(*models.Infra)
	operation, _ := r.Context().Value(types.OperationScope).(*models.Operation)

	workspaceID := models.GetWorkspaceID(infra, operation)

	// call apply on the provisioner service
	resp, err := c.Config().ProvisionerClient.GetLogs(context.Background(), workspaceID)
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	c.WriteResult(w, r, resp)
}
