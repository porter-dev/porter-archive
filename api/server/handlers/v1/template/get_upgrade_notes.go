package template

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/helm/loader"
	"github.com/porter-dev/porter/internal/helm/repo"
	"github.com/porter-dev/porter/internal/helm/upgrade"
	"github.com/porter-dev/porter/internal/models"
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
	project, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	request := &types.GetTemplateUpgradeNotesRequest{}

	ok := t.DecodeAndValidate(w, r, request)

	if !ok {
		return
	}

	hrs, err := t.Repo().HelmRepo().ListHelmReposByProjectID(project.ID)

	if err != nil {
		t.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	isValid := repo.ValidateRepoURL(t.Config().ServerConf.DefaultAddonHelmRepoURL, t.Config().ServerConf.DefaultApplicationHelmRepoURL, hrs, request.RepoURL)

	if !isValid {
		t.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
			fmt.Errorf("invalid repo_url parameter"),
			http.StatusBadRequest,
		))

		return
	}

	name, _ := requestutils.GetURLParamString(r, types.URLParamTemplateName)

	if name == "" {
		t.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
			fmt.Errorf("template name is required"),
			http.StatusBadRequest,
		))

		return
	}

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
