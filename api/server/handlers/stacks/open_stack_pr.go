package stacks

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/bradleyfalzon/ghinstallation/v2"
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

type OpenStackPRHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewOpenStackPRHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *OpenStackPRHandler {
	return &OpenStackPRHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *OpenStackPRHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
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
		c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error generating webhook UID for new stack: %w", err)))
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

	client, err := getGithubClient(c.Config(), ga.InstallationID)
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
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

	err = actions.OpenGithubPR(&actions.OpenGithubPROpts{
		Client: client,
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

	w.WriteHeader(http.StatusCreated)
}

func getGithubClient(config *config.Config, gitInstallationId int64) (*github.Client, error) {
	// get the github app client
	ghAppId, err := strconv.Atoi(config.ServerConf.GithubAppID)
	if err != nil {
		return nil, fmt.Errorf("malformed GITHUB_APP_ID in server configuration: %w", err)
	}

	// authenticate as github app installation
	itr, err := ghinstallation.New(
		http.DefaultTransport,
		int64(ghAppId),
		gitInstallationId,
		config.ServerConf.GithubAppSecret,
	)
	if err != nil {
		return nil, fmt.Errorf("error in creating github client for stack: %w", err)
	}

	return github.NewClient(&http.Client{Transport: itr}), nil
}
