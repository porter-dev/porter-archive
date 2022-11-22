package environment

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strings"

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
		c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error generating webhook UID for new preview "+
			"environment: %w", err)))
		return
	}

	env := &models.Environment{
		ProjectID:           project.ID,
		ClusterID:           cluster.ID,
		GitInstallationID:   uint(ga.InstallationID),
		Name:                request.Name,
		GitRepoOwner:        owner,
		GitRepoName:         name,
		GitRepoBranches:     strings.Join(request.GitRepoBranches, ","),
		Mode:                request.Mode,
		WebhookID:           string(webhookUID),
		NewCommentsDisabled: request.DisableNewComments,
	}

	if len(request.NamespaceLabels) > 0 {
		var labels []string

		for k, v := range request.NamespaceLabels {
			labels = append(labels, fmt.Sprintf("%s=%s", k, v))
		}

		env.NamespaceLabels = []byte(strings.Join(labels, ","))
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
		context.Background(), owner, name, &github.Hook{
			Config: map[string]interface{}{
				"url":          webhookURL,
				"content_type": "json",
				"secret":       c.Config().ServerConf.GithubIncomingWebhookSecret,
			},
			Events: []string{"pull_request"},
			Active: github.Bool(true),
		},
	)

	if err != nil && !strings.Contains(err.Error(), "already exists") {
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(fmt.Errorf("%v: %w", errGithubAPI, err),
			http.StatusConflict))
		return
	}

	env.GithubWebhookID = hook.GetID()

	env, err = c.Repo().Environment().CreateEnvironment(env)

	if err != nil {
		_, deleteErr := client.Repositories.DeleteHook(context.Background(), owner, name, hook.GetID())

		if deleteErr != nil {
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(fmt.Errorf("%v: %w", errGithubAPI, deleteErr),
				http.StatusConflict, "error creating environment"))
			return
		}

		c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error creating environment: %w", err)))
		return
	}

	// generate porter jwt token
	jwt, err := token.GetTokenForAPI(user.ID, project.ID)

	if err != nil {
		_, deleteErr := client.Repositories.DeleteHook(context.Background(), owner, name, hook.GetID())

		if deleteErr != nil {
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(fmt.Errorf("%v: %w", errGithubAPI, deleteErr),
				http.StatusConflict, "error getting token for API while creating environment"))
			return
		}

		_, deleteErr = c.Repo().Environment().DeleteEnvironment(env)

		if deleteErr != nil {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error deleting created preview environment: %w",
				deleteErr)))
			return
		}

		c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error getting token for API: %w", err)))
		return
	}

	encoded, err := jwt.EncodeToken(c.Config().TokenConf)

	if err != nil {
		_, deleteErr := client.Repositories.DeleteHook(context.Background(), owner, name, hook.GetID())

		if deleteErr != nil {
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(fmt.Errorf("%v: %w", errGithubAPI, deleteErr),
				http.StatusConflict, "error encoding token while creating environment"))
			return
		}

		_, deleteErr = c.Repo().Environment().DeleteEnvironment(env)

		if deleteErr != nil {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error deleting created preview environment: %w",
				deleteErr)))
			return
		}

		c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error encoding API token: %w", err)))
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
		InstanceName:      c.Config().ServerConf.InstanceName,
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
			c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error setting up preview environment in the github "+
				"repo: %w", err)))
			return
		}
	}

	c.WriteResult(w, r, env.ToEnvironmentType())
}

func getGithubWebhookURLFromUID(serverURL, webhookUID string) string {
	return fmt.Sprintf("%s/api/github/incoming_webhook/%s", serverURL, string(webhookUID))
}
