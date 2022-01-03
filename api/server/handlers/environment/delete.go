package environment

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/handlers/gitinstallation"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/integrations/ci/actions"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/models/integrations"
)

type DeleteEnvironmentHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewDeleteEnvironmentHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *DeleteEnvironmentHandler {
	return &DeleteEnvironmentHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *DeleteEnvironmentHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ga, _ := r.Context().Value(types.GitInstallationScope).(*integrations.GithubAppInstallation)
	project, _ := r.Context().Value(types.ProjectScope).(*models.Project)
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	owner, name, ok := gitinstallation.GetOwnerAndNameParams(c, w, r)

	if !ok {
		return
	}

	// read the environment to get the environment id
	env, err := c.Repo().Environment().ReadEnvironment(project.ID, cluster.ID, uint(ga.InstallationID), owner, name)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// delete Github actions files from the repo
	client, err := getGithubClientFromEnvironment(c.Config(), env)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	err = actions.DeleteEnv(&actions.EnvOpts{
		Client:            client,
		ServerURL:         c.Config().ServerConf.ServerURL,
		GitRepoOwner:      env.GitRepoOwner,
		GitRepoName:       env.GitRepoName,
		ProjectID:         project.ID,
		ClusterID:         cluster.ID,
		GitInstallationID: uint(ga.InstallationID),
		EnvironmentName:   env.Name,
	})

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// delete the environment
	env, err = c.Repo().Environment().DeleteEnvironment(env)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	c.WriteResult(w, r, env.ToEnvironmentType())
}
