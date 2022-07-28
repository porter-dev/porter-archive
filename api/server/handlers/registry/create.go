package registry

import (
	"errors"
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
	"gorm.io/gorm"
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

	// validate request before saving it to the DB
	integrationIDs := []uint{
		request.GCPIntegrationID,
		request.AWSIntegrationID,
		request.DOIntegrationID,
		request.BasicIntegrationID,
		request.AzureIntegrationID,
	}

	idCount := 0

	for _, id := range integrationIDs {
		if id != 0 {
			idCount += 1
		}
	}

	if idCount > 1 {
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
			fmt.Errorf("only one integration ID should be set"), http.StatusBadRequest,
		))
		return
	} else if idCount == 0 {
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
			fmt.Errorf("at least one integration ID should be set"), http.StatusBadRequest,
		))
		return
	}

	var err error

	if request.GCPIntegrationID != 0 {
		_, err := p.Repo().GCPIntegration().ReadGCPIntegration(proj.ID, request.GCPIntegrationID)

		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
					fmt.Errorf("no such GCP integration ID: %d for project ID: %d", request.GCPIntegrationID, proj.ID),
					http.StatusNotFound,
				))
				return
			}

			p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}
	} else if request.AWSIntegrationID != 0 {
		_, err = p.Repo().AWSIntegration().ReadAWSIntegration(proj.ID, request.AWSIntegrationID)

		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
					fmt.Errorf("no such AWS integration ID: %d for project ID: %d", request.AWSIntegrationID, proj.ID),
					http.StatusNotFound,
				))
				return
			}

			p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}
	} else if request.DOIntegrationID != 0 {
		_, err = p.Repo().OAuthIntegration().ReadOAuthIntegration(proj.ID, request.DOIntegrationID)

		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
					fmt.Errorf("no such DO integration ID: %d for project ID: %d", request.DOIntegrationID, proj.ID),
					http.StatusNotFound,
				))
				return
			}

			p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}
	} else if request.BasicIntegrationID != 0 {
		_, err = p.Repo().BasicIntegration().ReadBasicIntegration(proj.ID, request.BasicIntegrationID)

		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
					fmt.Errorf("no such basic integration ID: %d for project ID: %d", request.BasicIntegrationID, proj.ID),
					http.StatusNotFound,
				))
				return
			}

			p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}
	} else if request.AzureIntegrationID != 0 {
		_, err = p.Repo().AzureIntegration().ReadAzureIntegration(proj.ID, request.AzureIntegrationID)

		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
					fmt.Errorf("no such Azure integration ID: %d for project ID: %d", request.AzureIntegrationID, proj.ID),
					http.StatusNotFound,
				))
				return
			}

			p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}
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

		_, err = p.Repo().AzureIntegration().OverwriteAzureIntegration(az)

		if err != nil {
			p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}
	}

	// handle write to the database
	regModel, err = p.Repo().Registry().CreateRegistry(regModel)

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

	w.WriteHeader(http.StatusCreated)
	p.WriteResult(w, r, regModel.ToRegistryType())
}
