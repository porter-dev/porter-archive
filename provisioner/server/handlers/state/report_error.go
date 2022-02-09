package state

import (
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/provisioner/server/config"
	ptypes "github.com/porter-dev/porter/provisioner/types"
)

type ReportErrorHandler struct {
	Config           *config.Config
	decoderValidator shared.RequestDecoderValidator
}

func NewReportErrorHandler(
	config *config.Config,
) *ReportErrorHandler {
	return &ReportErrorHandler{
		Config:           config,
		decoderValidator: shared.NewDefaultRequestDecoderValidator(config.Logger, config.Alerter),
	}
}

func (c *ReportErrorHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// read the infra from the attached scope
	infra, _ := r.Context().Value(types.InfraScope).(*models.Infra)
	operation, _ := r.Context().Value(types.OperationScope).(*models.Operation)

	req := &ptypes.ReportErrorRequest{}

	if ok := c.decoderValidator.DecodeAndValidate(w, r, req); !ok {
		return
	}

	// update the infra to indicate error
	infra.Status = "errored"

	infra, err := c.Config.Repo.Infra().UpdateInfra(infra)

	if err != nil {
		apierrors.HandleAPIError(c.Config.Logger, c.Config.Alerter, w, r, apierrors.NewErrInternal(err), true)
		return
	}

	// update the operation with the error
	operation.Status = "errored"
	operation.Errored = true
	operation.Error = req.Error

	operation, err = c.Config.Repo.Infra().UpdateOperation(operation)

	if err != nil {
		apierrors.HandleAPIError(c.Config.Logger, c.Config.Alerter, w, r, apierrors.NewErrInternal(err), true)
		return
	}

	// report the error to the error alerter but don't send to client
	apierrors.HandleAPIError(c.Config.Logger, c.Config.Alerter, w, r, apierrors.NewErrInternal(
		fmt.Errorf(req.Error),
	), false)
}
