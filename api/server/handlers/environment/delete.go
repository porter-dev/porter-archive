package environment

import (
	"context"
	"errors"
	"fmt"
	"net/http"

	"github.com/google/go-github/v41/github"
	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/commonutils"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/integrations/ci/actions"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/models/integrations"
	"gorm.io/gorm"
)

type DeleteEnvironmentHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewDeleteEnvironmentHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *DeleteEnvironmentHandler {
	return &DeleteEnvironmentHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *DeleteEnvironmentHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ga, _ := r.Context().Value(types.GitInstallationScope).(*integrations.GithubAppInstallation)
	project, _ := r.Context().Value(types.ProjectScope).(*models.Project)
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	owner, name, ok := commonutils.GetOwnerAndNameParams(c, w, r)

	if !ok {
		return
	}

	// read the environment to get the environment id
	env, err := c.Repo().Environment().ReadEnvironment(project.ID, cluster.ID, uint(ga.InstallationID), owner, name)

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.HandleAPIError(w, r, apierrors.NewErrNotFound(errEnvironmentNotFound))
			return
		}

		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// delete all corresponding deployments
	agent, err := c.GetAgent(r, cluster, "")

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	depls, err := c.Repo().Environment().ListDeployments(env.ID)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	for _, depl := range depls {
		if !isSystemNamespace(depl.Namespace) {
			agent.DeleteNamespace(depl.Namespace)
		}
	}

	ghWebhookID := env.GithubWebhookID
	webhookUID := env.WebhookID

	// delete the environment
	env, err = c.Repo().Environment().DeleteEnvironment(env)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	client, err := getGithubClientFromEnvironment(c.Config(), env)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// FIXME: ignore the return status codes for now, should be fixed when we start returning all non-fatal errors
	if ghWebhookID != 0 {
		client.Repositories.DeleteHook(context.Background(), owner, name, ghWebhookID)
	} else {
		webhookURL := getGithubWebhookURLFromUID(c.Config().ServerConf.ServerURL, string(webhookUID))

		// FIXME: should be cycling through all webhooks if pagination is needed
		hooks, _, err := client.Repositories.ListHooks(context.Background(), owner, name, &github.ListOptions{})

		if err == nil {
			for _, hook := range hooks {
				if hookURL, ok := hook.Config["url"]; ok {
					if hookURLStr, ok := hookURL.(string); ok {
						if hookURLStr == webhookURL {
							client.Repositories.DeleteHook(context.Background(), owner, name, hook.GetID())
							break
						}
					}
				}
			}
		}
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
		InstanceName:      c.Config().ServerConf.InstanceName,
	})

	if err != nil {
		if errors.Is(err, actions.ErrProtectedBranch) {
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
				fmt.Errorf("we were unable to delete the Porter Preview Environment workflow files for this "+
					"repository as the default branch is protected. Please manually delete them."), http.StatusConflict,
			))
			return
		}

		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	c.WriteResult(w, r, env.ToEnvironmentType())
}
