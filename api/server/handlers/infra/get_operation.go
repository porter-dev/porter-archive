package infra

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/templater/parser"
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
	infra, _ := r.Context().Value(types.InfraScope).(*models.Infra)
	operation, _ := r.Context().Value(types.OperationScope).(*models.Operation)

	op, err := operation.ToOperationType()
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// TODO: get corresponding form rather than test form
	formYAML, err := parser.FormYAMLFromBytes(&parser.ClientConfigDefault{
		InfraOperation: operation,
	}, getFormBytesFromKind(string(infra.Kind)), "declared", "infra")
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	op.Form = formYAML

	c.WriteResult(w, r, op)
}
