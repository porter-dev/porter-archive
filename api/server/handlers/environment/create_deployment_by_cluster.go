package environment

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/internal/telemetry"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"gorm.io/gorm"
)

type CreateDeploymentByClusterHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewCreateDeploymentByClusterHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *CreateDeploymentByClusterHandler {
	return &CreateDeploymentByClusterHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *CreateDeploymentByClusterHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	tracer, _ := telemetry.InitTracer(r.Context(), c.Config().TelemetryConfig)
	defer tracer.Shutdown()

	ctx, span := telemetry.NewSpan(r.Context(), "serve-create-release")
	defer span.End()

	project, _ := r.Context().Value(types.ProjectScope).(*models.Project)
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "project-id", Value: project.ID},
		telemetry.AttributeKV{Key: "cluster-id", Value: cluster.ID},
	)

	request := &types.CreateDeploymentRequest{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		err := telemetry.Error(ctx, span, nil, "could not decode and validate request")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "repo-owner", Value: request.RepoOwner},
		telemetry.AttributeKV{Key: "repo-name", Value: request.RepoName},
	)

	// read the environment to get the environment id
	env, err := c.Repo().Environment().ReadEnvironmentByOwnerRepoName(
		project.ID, cluster.ID, request.RepoOwner, request.RepoName,
	)
	if err != nil {
		_ = telemetry.Error(ctx, span, err, "error reading environment by owner repo name")

		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.HandleAPIError(w, r, apierrors.NewErrNotFound(
				fmt.Errorf("error creating deployment: %w", errEnvironmentNotFound)),
			)
			return
		}

		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// create deployment on GitHub API
	client, err := getGithubClientFromEnvironment(c.Config(), env)
	if err != nil {
		_ = telemetry.Error(ctx, span, err, "error getting github client from environment")
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// add a check for Github PR status
	prClosed, err := isGithubPRClosed(client, request.RepoOwner, request.RepoName, int(request.PullRequestID))
	if err != nil {
		_ = telemetry.Error(ctx, span, err, "error checking if github pr is closed")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusConflict))
		return
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "pr-closed", Value: prClosed})

	if prClosed {
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
			fmt.Errorf("attempting to create deployment for a closed github PR"), http.StatusConflict,
		))
		return
	}

	ghDeployment, err := createGithubDeployment(client, env, request.PRBranchFrom, request.ActionID)
	if err != nil {
		_ = telemetry.Error(ctx, span, err, "error creating github deployment object")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusConflict))
		return
	}

	// create the deployment
	depl, err := c.Repo().Environment().CreateDeployment(&models.Deployment{
		EnvironmentID:  env.ID,
		Namespace:      request.Namespace,
		Status:         types.DeploymentStatusCreating,
		PullRequestID:  request.PullRequestID,
		GHDeploymentID: ghDeployment.GetID(),
		RepoOwner:      request.GitHubMetadata.RepoOwner,
		RepoName:       request.GitHubMetadata.RepoName,
		PRName:         request.GitHubMetadata.PRName,
		CommitSHA:      request.GitHubMetadata.CommitSHA,
		PRBranchFrom:   request.GitHubMetadata.PRBranchFrom,
		PRBranchInto:   request.GitHubMetadata.PRBranchInto,
	})
	if err != nil {
		_ = telemetry.Error(ctx, span, err, "error creating github deployment object")
		// try to delete the GitHub deployment
		_, deleteErr := client.Repositories.DeleteDeployment(
			ctx,
			env.GitRepoOwner,
			env.GitRepoName,
			ghDeployment.GetID(),
		)

		if deleteErr != nil {
			telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "delete-err", Value: deleteErr.Error()})
		}

		c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error creating deployment: %w", err)))
		return
	}

	c.WriteResult(w, r, depl.ToDeploymentType())
}
