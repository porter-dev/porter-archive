package infra

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type InfraGetOperationHandler struct {
	handlers.PorterHandlerWriter
}

func NewInfraGetOperationHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *InfraGetOperationHandler {
	return &InfraGetOperationHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (c *InfraGetOperationHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	operation, _ := r.Context().Value(types.OperationScope).(*models.Operation)

	op, err := operation.ToOperationType()

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	c.WriteResult(w, r, op)
}
