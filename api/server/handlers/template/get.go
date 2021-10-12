package template

import (
	"net/http"
	"strings"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/helm/loader"
	"github.com/porter-dev/porter/internal/templater/parser"
)

type TemplateGetHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewTemplateGetHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *TemplateGetHandler {
	return &TemplateGetHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (t *TemplateGetHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	request := &types.GetTemplateRequest{}

	ok := t.DecodeAndValidate(w, r, request)

	if !ok {
		return
	}

	name, _ := requestutils.GetURLParamString(r, types.URLParamTemplateName)
	version, _ := requestutils.GetURLParamString(r, types.URLParamTemplateVersion)

	// if version passed as latest, pass empty string to loader to get latest
	if version == "latest" {
		version = ""
	}

	if request.RepoURL == "" {
		request.RepoURL = t.Config().ServerConf.DefaultApplicationHelmRepoURL
	}

	chart, err := loader.LoadChartPublic(request.RepoURL, name, version)

	if err != nil {
		t.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	parserDef := &parser.ClientConfigDefault{
		HelmChart: chart,
	}

	res := &types.GetTemplateResponse{}
	res.Metadata = chart.Metadata
	res.Values = chart.Values

	for _, file := range chart.Files {
		if strings.Contains(file.Name, "form.yaml") {
			formYAML, err := parser.FormYAMLFromBytes(parserDef, file.Data, "declared")

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
