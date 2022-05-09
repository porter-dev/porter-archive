package registry

import (
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/analytics"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/oauth"
	"github.com/porter-dev/porter/internal/registry"
)

type RegistryCreateHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewRegistryCreateHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *RegistryCreateHandler {
	return &RegistryCreateHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (p *RegistryCreateHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	user, _ := r.Context().Value(types.UserScope).(*models.User)
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)
	operationID := oauth.CreateRandomState()

	p.Config().AnalyticsClient.Track(analytics.RegistryConnectionStartTrack(
		&analytics.RegistryConnectionStartTrackOpts{
			ProjectScopedTrackOpts: analytics.GetProjectScopedTrackOpts(user.ID, proj.ID),
			FlowID:                 operationID,
		},
	))

	request := &types.CreateRegistryRequest{}

	ok := p.DecodeAndValidate(w, r, request)

	if !ok {
		return
	}

	// create a registry model
	regModel := &models.Registry{
		Name:               request.Name,
		ProjectID:          proj.ID,
		URL:                request.URL,
		GCPIntegrationID:   request.GCPIntegrationID,
		AWSIntegrationID:   request.AWSIntegrationID,
		DOIntegrationID:    request.DOIntegrationID,
		BasicIntegrationID: request.BasicIntegrationID,
		AzureIntegrationID: request.AzureIntegrationID,
	}

	if regModel.URL == "" && regModel.AWSIntegrationID != 0 {
		url, err := registry.GetECRRegistryURL(p.Repo().AWSIntegration(), regModel.ProjectID, regModel.AWSIntegrationID)

		if err != nil {
			p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}

		regModel.URL = url
	} else if request.AzureIntegrationID != 0 {
		// if azure integration id is non-zero check that resource group name and repo name are set
		if request.ACRName == "" {
			p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
				fmt.Errorf("acr_name must be set if azure_integration_id is not 0"),
				http.StatusBadRequest,
			))

			return
		} else if request.ACRResourceGroupName == "" {
			p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
				fmt.Errorf("acr_resource_group_name must be set if azure_integration_id is not 0"),
				http.StatusBadRequest,
			))

			return
		}

		// get the azure integration and overwrite the names
		az, err := p.Repo().AzureIntegration().ReadAzureIntegration(proj.ID, request.AzureIntegrationID)

		if err != nil {
			p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}

		az.ACRName = request.ACRName
		az.ACRResourceGroupName = request.ACRResourceGroupName

		az, err = p.Repo().AzureIntegration().OverwriteAzureIntegration(az)

		if err != nil {
			p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}
	}

	// handle write to the database
	regModel, err := p.Repo().Registry().CreateRegistry(regModel)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	p.Config().AnalyticsClient.Track(analytics.RegistryConnectionSuccessTrack(
		&analytics.RegistryConnectionSuccessTrackOpts{
			RegistryScopedTrackOpts: analytics.GetRegistryScopedTrackOpts(user.ID, proj.ID, regModel.ID),
			FlowID:                  operationID,
		},
	))

	p.WriteResult(w, r, regModel.ToRegistryType())
}
