package helmrepo

import (
	"net/http"

	"k8s.io/helm/pkg/repo"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/helm/loader"
	"github.com/porter-dev/porter/internal/models"
)

type ChartListHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewChartListHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *ChartListHandler {
	return &ChartListHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (t *ChartListHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)
	helmRepo, _ := r.Context().Value(types.HelmRepoScope).(*models.HelmRepo)

	var repoIndex *repo.IndexFile
	var err error

	if helmRepo.BasicAuthIntegrationID != 0 {
		// read the basic integration id
		basic, err := t.Repo().BasicIntegration().ReadBasicIntegration(proj.ID, helmRepo.BasicAuthIntegrationID)
		if err != nil {
			t.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}

		repoIndex, err = loader.LoadRepoIndex(&loader.BasicAuthClient{
			Username: string(basic.Username),
			Password: string(basic.Password),
		}, helmRepo.RepoURL)
	} else {
		repoIndex, err = loader.LoadRepoIndexPublic(helmRepo.RepoURL)
	}

	if err != nil {
		t.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	charts := loader.RepoIndexToPorterChartList(repoIndex, helmRepo.RepoURL)

	t.WriteResult(w, r, charts)
}
