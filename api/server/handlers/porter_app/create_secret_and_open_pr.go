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
	ctx, span := telemetry.NewSpan(r.Context(), "serve-create-secret-and-open-pr")
	defer span.End()

	user, _ := ctx.Value(types.UserScope).(*models.User)
	project, _ := ctx.Value(types.ProjectScope).(*models.Project)
	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)

	stackName, reqErr := requestutils.GetURLParamString(r, types.URLParamStackName)
	if reqErr != nil {
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(reqErr, http.StatusBadRequest))
		return
	}
	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "stack-name", Value: stackName},
	)

	request := &types.CreateSecretAndOpenGHPRRequest{}
	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "repo-owner", Value: request.GithubRepoOwner},
		telemetry.AttributeKV{Key: "repo-name", Value: request.GithubRepoName},
		telemetry.AttributeKV{Key: "branch", Value: request.Branch},
		telemetry.AttributeKV{Key: "open-pr", Value: request.OpenPr},
	)

	client, err := getGithubClient(c.Config(), request.GithubAppInstallationID)
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// generate porter jwt token
	jwt, err := token.GetTokenForAPI(user.ID, project.ID)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "Error getting token for API")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}
	encoded, err := jwt.EncodeToken(c.Config().TokenConf)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "Error encoding token")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
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
		err = telemetry.Error(ctx, span, err, "Error creating github secret")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	var pr *github.PullRequest
	if request.OpenPr {
		pr, err = actions.OpenGithubPR(&actions.GithubPROpts{
			Client:         client,
			GitRepoOwner:   request.GithubRepoOwner,
			GitRepoName:    request.GithubRepoName,
			StackName:      stackName,
			ProjectID:      project.ID,
			ClusterID:      cluster.ID,
			ServerURL:      c.Config().ServerConf.ServerURL,
			DefaultBranch:  request.Branch,
			SecretName:     secretName,
			PorterYamlPath: request.PorterYamlPath,
			Body:           "Hello 👋 from Porter! Please merge this PR to finish setting up your application.",
		})
	}

	if err != nil {
		unwrappedErr := errors.Unwrap(err)

		if unwrappedErr != nil {
			if errors.Is(unwrappedErr, actions.ErrProtectedBranch) {
				err = telemetry.Error(ctx, span, err, "Branch is protected")
				c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusConflict))
			} else if errors.Is(unwrappedErr, actions.ErrCreatePRForProtectedBranch) {
				err = telemetry.Error(ctx, span, err, "Error creating PR for protected branch")
				c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusPreconditionFailed))
			}
		} else {
			err = telemetry.Error(ctx, span, err, "Error opening PR")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}
	}

	var resp types.CreateSecretAndOpenGHPRResponse
	if pr != nil {
		resp = types.CreateSecretAndOpenGHPRResponse{
			URL: pr.GetHTMLURL(),
		}

		// update DB with the PR url
		porterApp, err := c.Repo().PorterApp().ReadPorterAppByName(cluster.ID, stackName, 0)
		if err != nil {
			err = telemetry.Error(ctx, span, err, "Error reading porter app from db")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}

		porterApp.PullRequestURL = pr.GetHTMLURL()

		_, err = c.Repo().PorterApp().UpdatePorterApp(porterApp)
		if err != nil {
			err = telemetry.Error(ctx, span, err, "Unable to write pr url to porter app to db")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
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
