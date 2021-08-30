package template

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/helm/loader"
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
	request := &types.ListTemplatesRequest{}

	ok := t.DecodeAndValidate(w, r, request)

	if !ok {
		return
	}

	repoIndex, err := loader.LoadRepoIndexPublic(request.RepoURL)

	if err != nil {
		t.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	porterCharts := loader.RepoIndexToPorterChartList(repoIndex)

	t.WriteResult(w, r, porterCharts)
}
