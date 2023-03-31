package infra

import (
	"context"
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	ptypes "github.com/porter-dev/porter/provisioner/types"
)

type InfraRetryDeleteHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewInfraRetryDeleteHandler(config *config.Config, decoderValidator shared.RequestDecoderValidator, writer shared.ResultWriter) *InfraRetryDeleteHandler {
	return &InfraRetryDeleteHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *InfraRetryDeleteHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)
	infra, _ := r.Context().Value(types.InfraScope).(*models.Infra)

	req := &types.DeleteInfraRequest{}

	if ok := c.DecodeAndValidate(w, r, req); !ok {
		return
	}

	// verify the credentials
	err := checkInfraCredentials(c.Config(), proj, infra, req.InfraCredentials)
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrForbidden(err))
		return
	}

	lastOperation, err := c.Repo().Infra().GetLatestOperation(infra)
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// if the last operation is in a "starting" state, block apply
	if lastOperation.Status == "starting" {
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
			fmt.Errorf("Operation currently in progress. Please try again when latest operation has completed."),
			http.StatusBadRequest,
		))

		return
	}

	// call apply on the provisioner service
	resp, err := c.Config().ProvisionerClient.Delete(context.Background(), proj.ID, infra.ID, &ptypes.DeleteBaseRequest{
		OperationKind: "retry_delete",
	})
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	c.WriteResult(w, r, resp)
}
