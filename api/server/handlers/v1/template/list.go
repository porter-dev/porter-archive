package template

import (
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/helm/loader"
	"github.com/porter-dev/porter/internal/helm/repo"
	"github.com/porter-dev/porter/internal/models"
)

type TemplateListHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewTemplateListHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *TemplateListHandler {
	return &TemplateListHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (t *TemplateListHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	project, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	request := &types.ListTemplatesRequest{}

	ok := t.DecodeAndValidate(w, r, request)

	if !ok {
		return
	}

	repoURL := request.RepoURL

	if repoURL == "" {
		repoURL = t.Config().ServerConf.DefaultApplicationHelmRepoURL
	}

	hrs, err := t.Repo().HelmRepo().ListHelmReposByProjectID(project.ID)

	if err != nil {
		t.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	isValid := repo.ValidateRepoURL(t.Config().ServerConf.DefaultAddonHelmRepoURL, t.Config().ServerConf.DefaultApplicationHelmRepoURL, hrs, repoURL)

	if !isValid {
		t.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
			fmt.Errorf("invalid repo_url parameter"),
			http.StatusBadRequest,
		))

		return
	}

	repoIndex, err := loader.LoadRepoIndexPublic(repoURL)

	if err != nil {
		t.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	porterCharts := loader.RepoIndexToPorterChartList(repoIndex, repoURL)

	t.WriteResult(w, r, porterCharts)
}
