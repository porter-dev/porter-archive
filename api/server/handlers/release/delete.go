package release

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"helm.sh/helm/v3/pkg/release"
)

type DeleteReleaseHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewDeleteReleaseHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *DeleteReleaseHandler {
	return &DeleteReleaseHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *DeleteReleaseHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	user, _ := r.Context().Value(types.UserScope).(*models.User)
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)
	helmRelease, _ := r.Context().Value(types.ReleaseScope).(*release.Release)

	helmAgent, err := c.GetHelmAgent(r, cluster, "")

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	_, err = helmAgent.UninstallChart(helmRelease.Name)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	rel, releaseErr := c.Repo().Release().ReadRelease(cluster.ID, helmRelease.Name, helmRelease.Namespace)

	// update the github actions env if the release exists and is built from source
	if cName := helmRelease.Chart.Metadata.Name; cName == "job" || cName == "web" || cName == "worker" {
		if releaseErr == nil && rel != nil {
			gitAction := rel.GitActionConfig

			if gitAction != nil && gitAction.ID != 0 {
				gaRunner, err := getGARunner(
					c.Config(),
					user.ID,
					cluster.ProjectID,
					cluster.ID,
					rel.GitActionConfig,
					helmRelease.Name,
					helmRelease.Namespace,
					rel,
					helmRelease,
				)

				if err != nil {
					c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
					return
				}

				err = gaRunner.Cleanup()

				if err != nil {
					c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
					return
				}
			}
		}
	}
}
