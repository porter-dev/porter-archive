package environment

import (
	"fmt"
	"net/http"
	"strconv"

	ghinstallation "github.com/bradleyfalzon/ghinstallation/v2"
	"github.com/google/go-github/v41/github"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/handlers/gitinstallation"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/auth/token"
	"github.com/porter-dev/porter/internal/integrations/ci/actions"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/models/integrations"
)

type CreateEnvironmentHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewCreateEnvironmentHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *CreateEnvironmentHandler {
	return &CreateEnvironmentHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *CreateEnvironmentHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ga, _ := r.Context().Value(types.GitInstallationScope).(*integrations.GithubAppInstallation)
	user, _ := r.Context().Value(types.UserScope).(*models.User)
	project, _ := r.Context().Value(types.ProjectScope).(*models.Project)
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	owner, name, ok := gitinstallation.GetOwnerAndNameParams(c, w, r)

	if !ok {
		return
	}

	// create the environment
	request := &types.CreateEnvironmentRequest{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	env, err := c.Repo().Environment().CreateEnvironment(&models.Environment{
		ProjectID:         project.ID,
		ClusterID:         cluster.ID,
		GitInstallationID: uint(ga.InstallationID),
		Name:              request.Name,
		GitRepoOwner:      owner,
		GitRepoName:       name,
		Mode:              request.Mode,
	})

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// write Github actions files to the repo
	client, err := getGithubClientFromEnvironment(c.Config(), env)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	hooks, _, err := client.Repositories.ListHooks(
		r.Context(), owner, name, &github.ListOptions{},
	)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	webhookURL := fmt.Sprintf("%s/api/github/incoming_webhook", c.Config().ServerConf.ServerURL)

	for _, hook := range hooks {
		if hook.GetURL() == webhookURL {
			// if a previous webhook exists then we should delete it
			// this ensures that an updated webhook secret is maintained
			_, err = client.Repositories.DeleteHook(
				r.Context(), owner, name, hook.GetID(),
			)

			if err != nil {
				c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
				return
			}

			break
		}
	}

	// create incoming webhook
	_, _, err = client.Repositories.CreateHook(
		r.Context(), owner, name, &github.Hook{
			Config: map[string]interface{}{
				"url":          webhookURL,
				"content_type": "json",
				"secret":       c.Config().ServerConf.GithubIncomingWebhookSecret,
			},
			Events: []string{"pull_request"},
			Active: github.Bool(false),
		},
	)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// generate porter jwt token
	jwt, err := token.GetTokenForAPI(user.ID, project.ID)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	encoded, err := jwt.EncodeToken(c.Config().TokenConf)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	err = actions.SetupEnv(&actions.EnvOpts{
		Client:            client,
		ServerURL:         c.Config().ServerConf.ServerURL,
		PorterToken:       encoded,
		GitRepoOwner:      owner,
		GitRepoName:       name,
		ProjectID:         project.ID,
		ClusterID:         cluster.ID,
		GitInstallationID: uint(ga.InstallationID),
		EnvironmentName:   request.Name,
	})

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	c.WriteResult(w, r, env.ToEnvironmentType())
}

func getGithubClientFromEnvironment(config *config.Config, env *models.Environment) (*github.Client, error) {
	// get the github app client
	ghAppId, err := strconv.Atoi(config.ServerConf.GithubAppID)

	if err != nil {
		return nil, err
	}

	// authenticate as github app installation
	itr, err := ghinstallation.NewKeyFromFile(
		http.DefaultTransport,
		int64(ghAppId),
		int64(env.GitInstallationID),
		config.ServerConf.GithubAppSecretPath,
	)

	if err != nil {
		return nil, err
	}

	return github.NewClient(&http.Client{Transport: itr}), nil
}
