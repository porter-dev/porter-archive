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

type HelmRepoDeleteHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewHelmRepoDeleteHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *HelmRepoDeleteHandler {
	return &HelmRepoDeleteHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (p *HelmRepoDeleteHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
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

	if helmRepo.BasicAuthIntegrationID != 0 {
		basicAuthInt, err := p.Repo().BasicIntegration().ReadBasicIntegration(proj.ID, helmRepo.BasicAuthIntegrationID)

		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		} else if err == nil {
			_, err = p.Repo().BasicIntegration().DeleteBasicIntegration(basicAuthInt)

			if err != nil {
				p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
				return
			}
		}
	}

	err = p.Repo().HelmRepo().DeleteHelmRepo(helmRepo)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	p.WriteResult(w, r, helmRepo.ToHelmRepoType())
}
