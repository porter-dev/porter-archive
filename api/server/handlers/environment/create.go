package environment

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	ghinstallation "github.com/bradleyfalzon/ghinstallation/v2"
	"github.com/google/go-github/v41/github"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/commonutils"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/auth/token"
	"github.com/porter-dev/porter/internal/encryption"
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

	owner, name, ok := commonutils.GetOwnerAndNameParams(c, w, r)

	if !ok {
		return
	}

	// create the environment
	request := &types.CreateEnvironmentRequest{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	// create a random webhook id
	webhookUID, err := encryption.GenerateRandomBytes(32)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	env := &models.Environment{
		ProjectID:           project.ID,
		ClusterID:           cluster.ID,
		GitInstallationID:   uint(ga.InstallationID),
		Name:                request.Name,
		GitRepoOwner:        owner,
		GitRepoName:         name,
		Mode:                request.Mode,
		WebhookID:           string(webhookUID),
		NewCommentsDisabled: false,
	}

	// write Github actions files to the repo
	client, err := getGithubClientFromEnvironment(c.Config(), env)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	webhookURL := getGithubWebhookURLFromUID(c.Config().ServerConf.ServerURL, string(webhookUID))

	// create incoming webhook
	hook, _, err := client.Repositories.CreateHook(
		r.Context(), owner, name, &github.Hook{
			Config: map[string]interface{}{
				"url":          webhookURL,
				"content_type": "json",
				"secret":       c.Config().ServerConf.GithubIncomingWebhookSecret,
			},
			Events: []string{"pull_request"},
			Active: github.Bool(true),
		},
	)

	if err != nil && !strings.Contains(err.Error(), "already exists on this repository") {
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
			fmt.Errorf("error trying to create a new github repository webhook: %w", err), http.StatusConflict),
		)
		return
	}

	env.GithubWebhookID = hook.GetID()

	env, err = c.Repo().Environment().CreateEnvironment(env)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// generate porter jwt token
	jwt, err := token.GetTokenForAPI(user.ID, project.ID)

	if err != nil {
		c.deleteEnvAndReportError(w, r, env, err)
		return
	}

	encoded, err := jwt.EncodeToken(c.Config().TokenConf)

	if err != nil {
		c.deleteEnvAndReportError(w, r, env, err)
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
		unwrappedErr := errors.Unwrap(err)

		if unwrappedErr != nil {
			if errors.Is(unwrappedErr, actions.ErrProtectedBranch) {
				c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusConflict))
			} else if errors.Is(unwrappedErr, actions.ErrCreatePRForProtectedBranch) {
				c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusPreconditionFailed))
			}
		} else {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}
	}

	c.WriteResult(w, r, env.ToEnvironmentType())
}

func (c *CreateEnvironmentHandler) deleteEnvAndReportError(
	w http.ResponseWriter, r *http.Request, env *models.Environment, err error,
) {
	_, delErr := c.Repo().Environment().DeleteEnvironment(env)

	if delErr != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(delErr))
		return
	}

	c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
}

func getGithubClientFromEnvironment(config *config.Config, env *models.Environment) (*github.Client, error) {
	// get the github app client
	ghAppId, err := strconv.Atoi(config.ServerConf.GithubAppID)

	if err != nil {
		return nil, err
	}

	// authenticate as github app installation
	itr, err := ghinstallation.New(
		http.DefaultTransport,
		int64(ghAppId),
		int64(env.GitInstallationID),
		config.ServerConf.GithubAppSecret,
	)

	if err != nil {
		return nil, err
	}

	return github.NewClient(&http.Client{Transport: itr}), nil
}

func getGithubWebhookURLFromUID(serverURL, webhookUID string) string {
	return fmt.Sprintf("%s/api/github/incoming_webhook/%s", serverURL, string(webhookUID))
}
