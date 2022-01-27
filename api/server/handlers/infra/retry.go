package infra

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/provisioner/client"
	ptypes "github.com/porter-dev/porter/provisioner/types"
)

type InfraRetryHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewInfraRetryHandler(config *config.Config, decoderValidator shared.RequestDecoderValidator, writer shared.ResultWriter) *InfraRetryHandler {
	return &InfraRetryHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *InfraRetryHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)
	infra, _ := r.Context().Value(types.InfraScope).(*models.Infra)

	req := &types.RetryInfraRequest{}

	if ok := c.DecodeAndValidate(w, r, req); !ok {
		return
	}

	// verify the credentials
	err := checkInfraCredentials(c.Config(), proj, infra, req.InfraCredentials)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrForbidden(err))
		return
	}

	// if the values are nil, get the last applied values and marshal them
	if req.Values == nil || len(req.Values) == 0 {
		lastOperation, err := c.Repo().Infra().GetLatestOperation(infra)

		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}

		rawValues := lastOperation.LastApplied

		err = json.Unmarshal(rawValues, &req.Values)

		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}
	}

	// call apply on the provisioner service
	pClient := client.NewClient("http://localhost:8082/api/v1")

	resp, err := pClient.Apply(context.Background(), proj.ID, infra.ID, &ptypes.ProvisionBaseRequest{
		Kind:          string(infra.Kind),
		Values:        req.Values,
		OperationKind: "retry_create",
	})

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	c.WriteResult(w, r, resp)
}
