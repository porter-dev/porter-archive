package infra

import (
	"context"
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/encryption"
	"github.com/porter-dev/porter/internal/models"

	"github.com/porter-dev/porter/provisioner/client"

	ptypes "github.com/porter-dev/porter/provisioner/types"
)

type InfraCreateHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewInfraCreateHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *InfraCreateHandler {
	return &InfraCreateHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *InfraCreateHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	user, _ := r.Context().Value(types.UserScope).(*models.User)
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	req := &types.CreateInfraRequest{}

	if ok := c.DecodeAndValidate(w, r, req); !ok {
		return
	}

	suffix, err := encryption.GenerateRandomBytes(6)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// create the infra object
	infra := &models.Infra{
		Kind:            types.InfraECR,
		ProjectID:       proj.ID,
		Suffix:          suffix,
		Status:          types.StatusCreating,
		CreatedByUserID: user.ID,
		LastApplied:     []byte{},
	}

	// handle write to the database
	infra, err = c.Repo().Infra().CreateInfra(infra)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// call apply on the provisioner service
	pClient := client.NewClient("http://localhost:8082/api/v1")

	resp, err := pClient.Apply(context.Background(), proj.ID, infra.ID, &ptypes.ProvisionBaseRequest{
		Kind:   req.Kind,
		Values: req.Values,
	})

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	c.WriteResult(w, r, resp)
}
