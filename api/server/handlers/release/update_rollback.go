package release

import (
	"fmt"
	"net/http"

	semver "github.com/Masterminds/semver/v3"
	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"helm.sh/helm/v3/pkg/release"
)

type RollbackReleaseHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewRollbackReleaseHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *RollbackReleaseHandler {
	return &RollbackReleaseHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *RollbackReleaseHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	user, _ := r.Context().Value(types.UserScope).(*models.User)
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)
	helmRelease, _ := r.Context().Value(types.ReleaseScope).(*release.Release)

	helmAgent, err := c.GetHelmAgent(r, cluster, "")

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	request := &types.RollbackReleaseRequest{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	err = helmAgent.RollbackRelease(helmRelease.Name, request.Revision)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
			fmt.Errorf("error rolling back release: %s", err.Error()),
			http.StatusBadRequest,
		))

		return
	}

	// update the github actions env if the release exists and is built from source
	if cName := helmRelease.Chart.Metadata.Name; cName == "job" || cName == "web" || cName == "worker" {
		rel, err := c.Repo().Release().ReadRelease(cluster.ID, helmRelease.Name, helmRelease.Namespace)

		if err == nil && rel != nil {
			err = updateReleaseRepo(c.Config(), rel, helmRelease)

			if err != nil {
				c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
				return
			}

			gitAction := rel.GitActionConfig

			if gitAction != nil && gitAction.ID != 0 && gitAction.GitlabIntegrationID == 0 {
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

				actionVersion, err := semver.NewVersion(gaRunner.Version)

				if err != nil {
					c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
					return
				}

				if createEnvSecretConstraint.Check(actionVersion) {
					if err := gaRunner.CreateEnvSecret(); err != nil {
						c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
						return
					}
				}
			}
		}
	}
}

func updateReleaseRepo(config *config.Config, release *models.Release, helmRelease *release.Release) error {
	repository := helmRelease.Config["image"].(map[string]interface{})["repository"]
	repoStr, ok := repository.(string)

	if !ok {
		return fmt.Errorf("Could not find field repository in config")
	}

	if repoStr != release.ImageRepoURI &&
		repoStr != "public.ecr.aws/o1j4x7p4/hello-porter" &&
		repoStr != "public.ecr.aws/o1j4x7p4/hello-porter-job" {
		release.ImageRepoURI = repoStr
		_, err := config.Repo.Release().UpdateRelease(release)

		if err != nil {
			return err
		}
	}

	return nil
}
