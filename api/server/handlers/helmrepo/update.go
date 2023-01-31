package helmrepo

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"gorm.io/gorm"
)

type HelmRepoUpdateHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewHelmRepoUpdateHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *HelmRepoUpdateHandler {
	return &HelmRepoUpdateHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (p *HelmRepoUpdateHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	helmRepoID, reqErr := requestutils.GetURLParamUint(r, "helm_repo_id")

	if reqErr != nil {
		p.HandleAPIError(w, r, reqErr)
		return
	}

	helmRepo, err := p.Repo().HelmRepo().ReadHelmRepo(proj.ID, helmRepoID)

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			p.HandleAPIError(w, r, apierrors.NewErrNotFound(fmt.Errorf("no such helm repo")))
			return
		}

		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	request := &types.CreateUpdateHelmRepoRequest{}

	ok := p.DecodeAndValidate(w, r, request)

	if !ok {
		return
	}

	if request.BasicIntegrationID != 0 &&
		helmRepo.BasicAuthIntegrationID != 0 &&
		request.BasicIntegrationID != helmRepo.BasicAuthIntegrationID {
		bi, err := p.Repo().BasicIntegration().ReadBasicIntegration(proj.ID, helmRepo.BasicAuthIntegrationID)

		if err != nil {
			if !errors.Is(err, gorm.ErrRecordNotFound) {
				p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
				return
			}
		} else {
			_, err = p.Repo().BasicIntegration().DeleteBasicIntegration(bi)

			if err != nil {
				p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
				return
			}
		}
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

	helmRepo.Name = request.Name
	helmRepo.RepoURL = request.URL
	helmRepo.BasicAuthIntegrationID = request.BasicIntegrationID

	helmRepo, err = p.Repo().HelmRepo().UpdateHelmRepo(helmRepo)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	p.WriteResult(w, r, helmRepo.ToHelmRepoType())
}
