package release

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"gorm.io/gorm"
	"helm.sh/helm/v3/pkg/release"
)

type UpdateGitActionConfigHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewUpdateGitActionConfigHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *UpdateGitActionConfigHandler {
	return &UpdateGitActionConfigHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *UpdateGitActionConfigHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	helmRelease, _ := r.Context().Value(types.ReleaseScope).(*release.Release)

	request := &types.UpdateGitActionConfigRequest{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	// look up the release in the database; if not found, do not populate Porter fields
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)
	release, err := c.Repo().Release().ReadRelease(cluster.ID, helmRelease.Name, helmRelease.Namespace)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	actionConfig, err := c.Repo().GitActionConfig().ReadGitActionConfig(release.GitActionConfig.ID)

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			w.WriteHeader(http.StatusNotFound)
			return
		}

		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
	}

	actionConfig.GitBranch = request.GitActionConfig.GitBranch

	if err := c.Repo().GitActionConfig().UpdateGitActionConfig(actionConfig); err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	w.WriteHeader(http.StatusOK)
}
