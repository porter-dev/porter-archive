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

	// ensure there is a non-zero integration ID that belongs to the project
	if req.DOIntegrationID != 0 {
		_, err := c.Repo().OAuthIntegration().ReadOAuthIntegration(proj.ID, req.DOIntegrationID)

		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrForbidden(fmt.Errorf("do integration id %d not found in project %d", req.DOIntegrationID, proj.ID)))
			return
		}
	} else if req.AWSIntegrationID != 0 {
		_, err := c.Repo().AWSIntegration().ReadAWSIntegration(proj.ID, req.AWSIntegrationID)

		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrForbidden(fmt.Errorf("aws integration id %d not found in project %d", req.AWSIntegrationID, proj.ID)))
			return
		}
	} else if req.GCPIntegrationID != 0 {
		_, err := c.Repo().GCPIntegration().ReadGCPIntegration(proj.ID, req.GCPIntegrationID)

		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrForbidden(fmt.Errorf("gcp integration id %d not found in project %d", req.GCPIntegrationID, proj.ID)))
			return
		}
	} else {
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(fmt.Errorf("a cloud provider integration ID is required"), http.StatusBadRequest))
		return
	}

	suffix, err := encryption.GenerateRandomBytes(6)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// create the infra object
	infra := &models.Infra{
		Kind:             types.InfraKind(req.Kind),
		ProjectID:        proj.ID,
		Suffix:           suffix,
		Status:           types.StatusCreating,
		CreatedByUserID:  user.ID,
		DOIntegrationID:  req.DOIntegrationID,
		AWSIntegrationID: req.AWSIntegrationID,
		GCPIntegrationID: req.GCPIntegrationID,
		LastApplied:      []byte{},
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
