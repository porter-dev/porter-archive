package project

import (
	"errors"
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"gorm.io/gorm"
)

type OnboardingUpdateHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewOnboardingUpdateHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *OnboardingUpdateHandler {
	return &OnboardingUpdateHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (p *OnboardingUpdateHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	request := &types.UpdateOnboardingRequest{}

	if ok := p.DecodeAndValidate(w, r, request); !ok {
		return
	}

	// look for onboarding
	onboarding, err := p.Repo().Onboarding().ReadProjectOnboarding(proj.ID)
	isNotFound := errors.Is(gorm.ErrRecordNotFound, err)

	if err != nil && !isNotFound {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	if isNotFound {
		onboarding = &models.Onboarding{
			ProjectID: proj.ID,
		}
	}

	onboarding.CurrentStep = request.CurrentStep
	onboarding.ConnectedSource = request.ConnectedSource
	onboarding.SkipRegistryConnection = request.SkipRegistryConnection
	onboarding.SkipResourceProvision = request.SkipResourceProvision
	onboarding.RegistryConnectionID = request.RegistryConnectionID
	onboarding.RegistryInfraID = request.RegistryInfraID
	onboarding.ClusterInfraID = request.ClusterInfraID

	if isNotFound {
		// if not found, create onboarding struct
		onboarding, err = p.Repo().Onboarding().CreateProjectOnboarding(onboarding)
	} else {
		// otherwise, update the onboarding model
		onboarding, err = p.Repo().Onboarding().UpdateProjectOnboarding(onboarding)
	}

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// return onboarding data type
	p.WriteResult(w, r, onboarding.ToOnboardingType())
}
