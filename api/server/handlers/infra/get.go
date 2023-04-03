package infra

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"gorm.io/gorm"
)

type InfraGetHandler struct {
	handlers.PorterHandlerWriter
}

func NewInfraGetHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *InfraGetHandler {
	return &InfraGetHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (c *InfraGetHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	infra, _ := r.Context().Value(types.InfraScope).(*models.Infra)

	res := infra.ToInfraType()

	// look for the latest operation and attach it, if it exists
	operation, err := c.Repo().Infra().GetLatestOperation(infra)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("latest operation not found")))
			return
		}

		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	op, err := operation.ToOperationType()
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	res.LatestOperation = op

	c.WriteResult(w, r, res)
}
