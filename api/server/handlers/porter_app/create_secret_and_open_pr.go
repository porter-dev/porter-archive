package porter_app

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
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/auth/token"
	"github.com/porter-dev/porter/internal/integrations/ci/actions"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
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
	ctx, span := telemetry.NewSpan(r.Context(), "serve-open-stack-pr")
	defer span.End()

	user, _ := ctx.Value(types.UserScope).(*models.User)
	project, _ := ctx.Value(types.ProjectScope).(*models.Project)
	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)
	appName, reqErr := requestutils.GetURLParamString(r, types.URLParamPorterAppName)
	if reqErr != nil {
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(reqErr, http.StatusBadRequest))
		return
	}

	request := &types.CreateSecretAndOpenGHPRRequest{}
	if ok := c.DecodeAndValidate(w, r, request); !ok {
		err := telemetry.Error(ctx, span, nil, "error decoding request")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	client, err := getGithubClient(c.Config(), request.GithubAppInstallationID)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error creating github client")
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	var secretName string
	if request.DeleteWorkflowFilename == "" {
		// generate porter jwt token
		jwt, err := token.GetTokenForAPI(user.ID, project.ID)
		if err != nil {
			err = fmt.Errorf("error getting token for API: %w", err)
			err := telemetry.Error(ctx, span, err, err.Error())
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}
		encoded, err := jwt.EncodeToken(c.Config().TokenConf)
		if err != nil {
			err = fmt.Errorf("error encoding API token: %w", err)
			err := telemetry.Error(ctx, span, err, err.Error())
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}

		// create porter secret
		secretName = fmt.Sprintf("PORTER_STACK_%d_%d", project.ID, cluster.ID)
		err = actions.CreateGithubSecret(
			client,
			secretName,
			encoded,
			request.GithubRepoOwner,
			request.GithubRepoName,
		)
		if err != nil {
			err = fmt.Errorf("error generating secret: %w", err)
			err := telemetry.Error(ctx, span, err, err.Error())
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}
	}

	var pr *github.PullRequest
	var prRequestBody string
	if request.DeleteWorkflowFilename == "" {
		prRequestBody = "Hello 👋 from Porter! Please merge this PR to finish setting up your application."
	} else {
		prRequestBody = "Please merge this PR to delete the workflow file associated with your application."
	}
	if request.OpenPr || request.DeleteWorkflowFilename != "" {
		pr, err = actions.OpenGithubPR(&actions.GithubPROpts{
			Client:                 client,
			GitRepoOwner:           request.GithubRepoOwner,
			GitRepoName:            request.GithubRepoName,
			StackName:              appName,
			ProjectID:              project.ID,
			ClusterID:              cluster.ID,
			ServerURL:              c.Config().ServerConf.ServerURL,
			DefaultBranch:          request.Branch,
			SecretName:             secretName,
			PorterYamlPath:         request.PorterYamlPath,
			Body:                   prRequestBody,
			DeleteWorkflowFilename: request.DeleteWorkflowFilename,
		})
	}

	if err != nil {
		unwrappedErr := errors.Unwrap(err)

		if unwrappedErr != nil {
			if errors.Is(unwrappedErr, actions.ErrProtectedBranch) {
				c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusConflict))
				return
			} else if errors.Is(unwrappedErr, actions.ErrCreatePRForProtectedBranch) {
				c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusPreconditionFailed))
				return
			}
		} else {
			err = fmt.Errorf("error setting up application in the github "+
				"repo: %w", err)
			err := telemetry.Error(ctx, span, err, err.Error())
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}
	}

	var resp types.CreateSecretAndOpenGHPRResponse
	if pr != nil {
		resp = types.CreateSecretAndOpenGHPRResponse{
			URL: pr.GetHTMLURL(),
		}

		if request.DeleteWorkflowFilename == "" {
			// update DB with the PR url
			porterApp, err := c.Repo().PorterApp().ReadPorterAppByName(cluster.ID, appName)
			if err != nil {
				err = fmt.Errorf("unable to get porter app db: %w", err)
				err := telemetry.Error(ctx, span, err, err.Error())
				c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
				return
			}

			porterApp.PullRequestURL = pr.GetHTMLURL()

			_, err = c.Repo().PorterApp().UpdatePorterApp(porterApp)
			if err != nil {
				err = fmt.Errorf("unable to write pr url to porter app db: %w", err)
				err := telemetry.Error(ctx, span, err, err.Error())
				c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
				return
			}
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
