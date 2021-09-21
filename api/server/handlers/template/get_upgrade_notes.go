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
	"github.com/porter-dev/porter/internal/helm/upgrade"
)

type TemplateGetUpgradeNotesHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewTemplateGetUpgradeNotesHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *TemplateGetUpgradeNotesHandler {
	return &TemplateGetUpgradeNotesHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (t *TemplateGetUpgradeNotesHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	request := &types.GetTemplateUpgradeNotesRequest{}

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

	prevVersion := request.PrevVersion

	if prevVersion == "" {
		prevVersion = "v0.0.0"
	}

	chart, err := loader.LoadChartPublic(request.RepoURL, name, version)

	if err != nil {
		t.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	res := &upgrade.UpgradeFile{}

	for _, file := range chart.Files {
		if strings.Contains(file.Name, "upgrade.yaml") {
			upgradeFile, err := upgrade.ParseUpgradeFileFromBytes(file.Data)

			if err != nil {
				break
			}

			upgradeFile, err = upgradeFile.GetUpgradeFileBetweenVersions(prevVersion, version)

			if err != nil {
				break
			}

			res = upgradeFile
		}
	}

	t.WriteResult(w, r, res)
}
