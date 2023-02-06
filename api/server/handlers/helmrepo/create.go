package helmrepo

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

type HelmRepoCreateHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewHelmRepoCreateHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *HelmRepoCreateHandler {
	return &HelmRepoCreateHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (p *HelmRepoCreateHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	request := &types.CreateUpdateHelmRepoRequest{}

	ok := p.DecodeAndValidate(w, r, request)

	if !ok {
		return
	}

	// if a basic integration is specified, verify that it exists in the project
	if request.BasicIntegrationID != 0 {
		_, err := p.Repo().BasicIntegration().ReadBasicIntegration(proj.ID, request.BasicIntegrationID)

		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				p.HandleAPIError(w, r, apierrors.NewErrForbidden(
					fmt.Errorf("basic integration with id %d not found in project %d", request.BasicIntegrationID, proj.ID),
				))

				return
			}

			p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}
	}

	hr := &models.HelmRepo{
		Name:                   request.Name,
		ProjectID:              proj.ID,
		RepoURL:                request.URL,
		BasicAuthIntegrationID: request.BasicIntegrationID,
	}

	// handle write to the database
	hr, err := p.Repo().HelmRepo().CreateHelmRepo(hr)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	p.WriteResult(w, r, hr.ToHelmRepoType())
}
