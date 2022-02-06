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

	suffix, err := encryption.GenerateRandomBytes(6)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	sourceLink, sourceVersion := getSourceLinkAndVersion(types.InfraKind(req.Kind))

	// create the infra object
	infra := &models.Infra{
		Kind:            types.InfraKind(req.Kind),
		APIVersion:      "v2",
		ProjectID:       proj.ID,
		Suffix:          suffix,
		Status:          types.StatusCreating,
		CreatedByUserID: user.ID,
		SourceLink:      sourceLink,
		SourceVersion:   sourceVersion,
	}

	// verify the credentials
	err = checkInfraCredentials(c.Config(), proj, infra, req.InfraCredentials)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrForbidden(err))
		return
	}

	// handle write to the database
	infra, err = c.Repo().Infra().CreateInfra(infra)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// call apply on the provisioner service
	pClient := client.NewClient("http://localhost:8082/api/v1")

	resp, err := pClient.Apply(context.Background(), proj.ID, infra.ID, &ptypes.ApplyBaseRequest{
		Kind:          req.Kind,
		Values:        req.Values,
		OperationKind: "create",
	})

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	c.WriteResult(w, r, resp)
}

func checkInfraCredentials(config *config.Config, proj *models.Project, infra *models.Infra, req *types.InfraCredentials) error {
	if req == nil {
		return nil
	}

	if req.DOIntegrationID != 0 {
		_, err := config.Repo.OAuthIntegration().ReadOAuthIntegration(proj.ID, req.DOIntegrationID)

		if err != nil {
			return fmt.Errorf("do integration id %d not found in project %d", req.DOIntegrationID, proj.ID)
		}

		infra.DOIntegrationID = req.DOIntegrationID
		infra.AWSIntegrationID = 0
		infra.GCPIntegrationID = 0
	} else if req.AWSIntegrationID != 0 {
		_, err := config.Repo.AWSIntegration().ReadAWSIntegration(proj.ID, req.AWSIntegrationID)

		if err != nil {
			return fmt.Errorf("aws integration id %d not found in project %d", req.AWSIntegrationID, proj.ID)
		}

		infra.DOIntegrationID = 0
		infra.AWSIntegrationID = req.AWSIntegrationID
		infra.GCPIntegrationID = 0
	} else if req.GCPIntegrationID != 0 {
		_, err := config.Repo.GCPIntegration().ReadGCPIntegration(proj.ID, req.GCPIntegrationID)

		if err != nil {
			return fmt.Errorf("gcp integration id %d not found in project %d", req.GCPIntegrationID, proj.ID)
		}

		infra.DOIntegrationID = 0
		infra.AWSIntegrationID = 0
		infra.GCPIntegrationID = req.GCPIntegrationID
	}

	if infra.DOIntegrationID == 0 && infra.AWSIntegrationID == 0 && infra.GCPIntegrationID == 0 {
		return fmt.Errorf("at least one integration id must be set")
	}

	return nil
}

// getSourceLinkAndVersion returns the source link and version for the infrastructure. For now,
// this is hardcoded
func getSourceLinkAndVersion(kind types.InfraKind) (string, string) {
	switch kind {
	case types.InfraECR:
		return "porter/aws/ecr", "v0.1.0"
	case types.InfraEKS:
		return "porter/aws/eks", "v0.1.0"
	case types.InfraRDS:
		return "porter/aws/rds", "v0.1.0"
	case types.InfraGCR:
		return "porter/gcp/gcr", "v0.1.0"
	case types.InfraGKE:
		return "porter/gcp/gke", "v0.1.0"
	case types.InfraDOCR:
		return "porter/do/docr", "v0.1.0"
	case types.InfraDOKS:
		return "porter/do/doks", "v0.1.0"
	}

	return "porter/test", "v0.1.0"
}
