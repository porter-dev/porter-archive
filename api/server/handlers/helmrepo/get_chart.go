package helmrepo

import (
	"net/http"
	"strings"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/handlers/release"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/templater/parser"
)

type ChartGetHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewChartGetHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *ChartGetHandler {
	return &ChartGetHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (t *ChartGetHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)
	helmRepo, _ := r.Context().Value(types.HelmRepoScope).(*models.HelmRepo)

	name, _ := requestutils.GetURLParamString(r, types.URLParamTemplateName)
	version, _ := requestutils.GetURLParamString(r, types.URLParamTemplateVersion)

	// if version passed as latest, pass empty string to loader to get latest
	if version == "latest" {
		version = ""
	}

	chart, err := release.LoadChart(t.Config(), &release.LoadAddonChartOpts{
		ProjectID:       proj.ID,
		RepoURL:         helmRepo.RepoURL,
		TemplateName:    name,
		TemplateVersion: version,
	})
	if err != nil {
		t.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	parserDef := &parser.ClientConfigDefault{
		HelmChart: chart,
	}

	res := &types.GetTemplateResponse{
		RepoURL: helmRepo.RepoURL,
	}
	res.Metadata = chart.Metadata
	res.Values = chart.Values

	for _, file := range chart.Files {
		if strings.Contains(file.Name, "form.yaml") {
			formYAML, err := parser.FormYAMLFromBytes(parserDef, file.Data, "declared", "")
			if err != nil {
				break
			}

			res.Form = formYAML
		} else if strings.Contains(file.Name, "README.md") {
			res.Markdown = string(file.Data)
		}
	}

	t.WriteResult(w, r, res)
}
