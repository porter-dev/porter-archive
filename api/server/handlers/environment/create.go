package environment

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"sync"

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
	"gorm.io/gorm"
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
		GitDeployBranches:   strings.Join(request.GitDeployBranches, ","),
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
			Events: []string{"pull_request", "push"},
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

	envType := env.ToEnvironmentType()

	if len(envType.GitDeployBranches) > 0 && c.Config().ServerConf.EnableAutoPreviewBranchDeploy {
		errs := autoDeployBranch(env, c.Config(), envType.GitDeployBranches, false)

		if len(errs) > 0 {
			errString := errs[0].Error()

			for _, e := range errs {
				errString += ": " + e.Error()
			}

			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
				fmt.Errorf("error auto deploying preview branches: %s", errString), http.StatusConflict),
			)
			return
		}
	}

	c.WriteResult(w, r, envType)
}

func getGithubWebhookURLFromUID(serverURL, webhookUID string) string {
	return fmt.Sprintf("%s/api/github/incoming_webhook/%s", serverURL, string(webhookUID))
}

func autoDeployBranch(
	env *models.Environment,
	config *config.Config,
	branches []string,
	onlyNewDeployments bool,
) []error {
	var (
		errs []error
		wg   sync.WaitGroup
	)

	for _, branch := range branches {
		wg.Add(1)

		go func(errs []error, branch string) {
			defer wg.Done()
			errs = append(errs, createWorkflowDispatchForBranch(env, config, onlyNewDeployments, branch)...)
		}(errs, branch)
	}

	wg.Wait()

	return errs
}

func createWorkflowDispatchForBranch(
	env *models.Environment,
	config *config.Config,
	onlyNewDeployments bool,
	branch string,
) []error {
	var errs []error

	client, err := getGithubClientFromEnvironment(config, env)

	if err != nil {
		errs = append(errs, err)
		return errs
	}

	var deplID uint

	depl, err := config.Repo.Environment().ReadDeploymentForBranch(env.ID, env.GitRepoOwner, env.GitRepoName, branch)

	if err == nil {
		if onlyNewDeployments {
			return errs
		}

		deplID = depl.ID
	} else {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			depl, err := config.Repo.Environment().CreateDeployment(&models.Deployment{
				EnvironmentID: env.ID,
				Status:        types.DeploymentStatusCreating,
				PRName:        fmt.Sprintf("Deployment for branch %s", branch),
				RepoName:      env.GitRepoName,
				RepoOwner:     env.GitRepoOwner,
				PRBranchFrom:  branch,
				PRBranchInto:  branch,
			})

			if err != nil {
				errs = append(errs, fmt.Errorf("error creating deployment for branch %s: %w", branch, err))
				return errs
			}

			deplID = depl.ID
		} else {
			errs = append(errs, fmt.Errorf("error reading deployment for branch %s: %w", branch, err))
			return errs
		}
	}

	if deplID == 0 {
		errs = append(errs, fmt.Errorf("deployment id is 0 for branch %s", branch))
		return errs
	}

	_, err = client.Actions.CreateWorkflowDispatchEventByFileName(
		context.Background(), env.GitRepoOwner, env.GitRepoName, fmt.Sprintf("porter_%s_env.yml", env.Name),
		github.CreateWorkflowDispatchEventRequest{
			Ref: branch,
			Inputs: map[string]interface{}{
				"pr_number":      fmt.Sprintf("%d", deplID),
				"pr_title":       fmt.Sprintf("Deployment for branch %s", branch),
				"pr_branch_from": branch,
				"pr_branch_into": branch,
			},
		},
	)

	if err != nil {
		errs = append(errs, err)
	}

	return errs
}
