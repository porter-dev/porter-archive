package stacks

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"

	"github.com/bradleyfalzon/ghinstallation/v2"
	"github.com/google/go-github/v41/github"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/auth/token"
	"github.com/porter-dev/porter/internal/integrations/ci/actions"
	"github.com/porter-dev/porter/internal/models"
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
	user, _ := r.Context().Value(types.UserScope).(*models.User)
	project, _ := r.Context().Value(types.ProjectScope).(*models.Project)
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	request := &types.CreateSecretAndOpenGHPRRequest{}
	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	client, err := getGithubClient(c.Config(), request.GithubAppInstallationID)
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// generate porter jwt token
	jwt, err := token.GetTokenForAPI(user.ID, project.ID)
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error getting token for API: %w", err)))
		return
	}
	encoded, err := jwt.EncodeToken(c.Config().TokenConf)
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error encoding API token: %w", err)))
		return
	}

	// create porter secret
	secretName := fmt.Sprintf("PORTER_STACK_%d_%d", project.ID, cluster.ID)
	err = actions.CreateGithubSecret(
		client,
		secretName,
		encoded,
		request.GithubRepoOwner,
		request.GithubRepoName,
	)
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error generating secret: %w", err)))
		return
	}

	var pr *github.PullRequest
	if request.OpenPr {
		pr, err = actions.OpenGithubPR(&actions.GithubPROpts{
			Client:        client,
			GitRepoOwner:  request.GithubRepoOwner,
			GitRepoName:   request.GithubRepoName,
			StackName:     request.StackName,
			ProjectID:     project.ID,
			ClusterID:     cluster.ID,
			ServerURL:     c.Config().ServerConf.ServerURL,
			DefaultBranch: request.Branch,
			SecretName:    secretName,
		})
	}

	if err != nil {
		unwrappedErr := errors.Unwrap(err)

		if unwrappedErr != nil {
			if errors.Is(unwrappedErr, actions.ErrProtectedBranch) {
				c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusConflict))
			} else if errors.Is(unwrappedErr, actions.ErrCreatePRForProtectedBranch) {
				c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusPreconditionFailed))
			}
		} else {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error setting up application in the github "+
				"repo: %w", err)))
			return
		}
	}

	var resp types.CreateSecretAndOpenGHPRResponse
	if pr != nil {
		resp = types.CreateSecretAndOpenGHPRResponse{
			URL: pr.GetHTMLURL(),
		}
	}

	w.WriteHeader(http.StatusCreated)
	c.WriteResult(w, r, resp)
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
