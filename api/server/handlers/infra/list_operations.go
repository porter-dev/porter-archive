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

type InfraListOperationsHandler struct {
	handlers.PorterHandlerWriter
}

func NewInfraListOperationsHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *InfraListOperationsHandler {
	return &InfraListOperationsHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (c *InfraListOperationsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	infra, _ := r.Context().Value(types.InfraScope).(*models.Infra)

	ops, err := c.Repo().Infra().ListOperations(infra.ID)
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	res := make([]*types.OperationMeta, 0)

	for _, op := range ops {
		res = append(res, op.ToOperationMetaType())
	}

	c.WriteResult(w, r, res)
}
