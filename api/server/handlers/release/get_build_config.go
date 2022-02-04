package release

import (
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"gorm.io/gorm"
	"helm.sh/helm/v3/pkg/release"
)

type GetBuildConfigHandler struct {
	handlers.PorterHandlerWriter
	authz.KubernetesAgentGetter
}

func NewGetBuildConfigHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *ReleaseGetHandler {
	return &ReleaseGetHandler{
		PorterHandlerWriter:   handlers.NewDefaultPorterHandler(config, nil, writer),
		KubernetesAgentGetter: authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *GetBuildConfigHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	helmRelease, _ := r.Context().Value(types.ReleaseScope).(*release.Release)

	// look up the release in the database; if not found, do not populate Porter fields
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)
	release, err := c.Repo().Release().ReadRelease(cluster.ID, helmRelease.Name, helmRelease.Namespace)

	if err == nil {
		if release.BuildConfig != 0 {
			bc, err := c.Repo().BuildConfig().GetBuildConfig(release.BuildConfig)

			if err != nil {
				c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
				return
			}

			build_config := bc.ToBuildConfigType()

			c.WriteResult(w, r, build_config)
			return
		}
	} else if err != gorm.ErrRecordNotFound {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}
	err = fmt.Errorf("build config not found")
	c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, 404))
}
