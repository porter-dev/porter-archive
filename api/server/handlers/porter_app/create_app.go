package porter_app

import (
	"context"
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"github.com/porter-dev/porter/internal/telemetry"
)

// CreateAppHandler is the handler for the /apps/create endpoint
type CreateAppHandler struct {
	handlers.PorterHandlerReadWriter
}

// NewCreateAppHandler handles POST requests to the endpoint /apps/create
func NewCreateAppHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *CreateAppHandler {
	return &CreateAppHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

// SourceType is a string type specifying the source type of an app. This is specified in the incoming request
type SourceType string

const (
	// SourceType_Github is the source kind for a github repo
	SourceType_Github SourceType = "github"
	// SourceType_DockerRegistry is the source kind for an app using an image from a docker registry
	SourceType_DockerRegistry SourceType = "docker-registry"
)

// Image is the image used by an app with a docker registry source
type Image struct {
	Repository string `json:"repository"`
	Tag        string `json:"tag"`
}

// CreateAppRequest is the request object for the /apps/create endpoint
type CreateAppRequest struct {
	Name           string     `json:"name"`
	Type           SourceType `json:"type"`
	GitBranch      string     `json:"git_branch"`
	GitRepoName    string     `json:"git_repo_name"`
	GitRepoID      uint       `json:"git_repo_id"`
	PorterYamlPath string     `json:"porter_yaml_path"`
	Image          *Image     `json:"image,omitempty"`
}

// CreateGithubAppInput is the input for creating an app with a github source
type CreateGithubAppInput struct {
	ProjectID           uint
	ClusterID           uint
	Name                string
	GitBranch           string
	GitRepoName         string
	PorterYamlPath      string
	GitRepoID           uint
	PorterAppRepository repository.PorterAppRepository
}

// CreateDockerRegistryAppInput is the input for creating an app with a docker registry source
type CreateDockerRegistryAppInput struct {
	ProjectID           uint
	ClusterID           uint
	Name                string
	Repository          string
	Tag                 string
	PorterAppRepository repository.PorterAppRepository
}

func (c *CreateAppHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-create-app")
	defer span.End()

	project, _ := ctx.Value(types.ProjectScope).(*models.Project)
	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)

	if !project.ValidateApplyV2 {
		err := telemetry.Error(ctx, span, nil, "project does not have validate apply v2 enabled")
		c.HandleAPIError(w, r, apierrors.NewErrForbidden(err))
		return
	}

	request := &CreateAppRequest{}
	if ok := c.DecodeAndValidate(w, r, request); !ok {
		err := telemetry.Error(ctx, span, nil, "error decoding request")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	if request.Name == "" {
		err := telemetry.Error(ctx, span, nil, "name is required")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "app-name", Value: request.Name})

	if request.Type == "" {
		err := telemetry.Error(ctx, span, nil, "source type is required")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "source-type", Value: request.Type})

	var porterApp *types.PorterApp
	switch request.Type {
	case SourceType_Github:
		if request.GitRepoID == 0 {
			err := telemetry.Error(ctx, span, nil, "git repo id is required")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
			return
		}

		if request.GitBranch == "" {
			err := telemetry.Error(ctx, span, nil, "git branch is required")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
			return
		}

		if request.GitRepoName == "" {
			err := telemetry.Error(ctx, span, nil, "git repo name is required")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
			return
		}

		telemetry.WithAttributes(span,
			telemetry.AttributeKV{Key: "git-branch", Value: request.GitBranch},
			telemetry.AttributeKV{Key: "git-repo-name", Value: request.GitRepoName},
		)

		input := CreateGithubAppInput{
			ProjectID:           project.ID,
			ClusterID:           cluster.ID,
			Name:                request.Name,
			GitRepoID:           request.GitRepoID,
			GitBranch:           request.GitBranch,
			GitRepoName:         request.GitRepoName,
			PorterYamlPath:      request.PorterYamlPath,
			PorterAppRepository: c.Repo().PorterApp(),
		}

		app, err := createGithubApp(ctx, input)
		if err != nil {
			err := telemetry.Error(ctx, span, err, "error creating github app")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}
		porterApp = app.ToPorterAppType()
	case SourceType_DockerRegistry:
		if request.Image == nil {
			err := telemetry.Error(ctx, span, nil, "image is required")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
			return
		}

		telemetry.WithAttributes(span,
			telemetry.AttributeKV{Key: "image-repo-uri", Value: fmt.Sprintf("%s:%s", request.Image.Repository, request.Image.Tag)},
		)

		input := CreateDockerRegistryAppInput{
			ProjectID:           project.ID,
			ClusterID:           cluster.ID,
			Name:                request.Name,
			Repository:          request.Image.Repository,
			Tag:                 request.Image.Tag,
			PorterAppRepository: c.Repo().PorterApp(),
		}

		app, err := createDockerRegistryApp(ctx, input)
		if err != nil {
			err := telemetry.Error(ctx, span, err, "error creating docker registry app")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}
		porterApp = app.ToPorterAppType()
	default:
		err := telemetry.Error(ctx, span, nil, "source type not supported")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "app-id", Value: porterApp.ID})

	c.WriteResult(w, r, porterApp)
}

func createGithubApp(ctx context.Context, input CreateGithubAppInput) (*models.PorterApp, error) {
	ctx, span := telemetry.NewSpan(ctx, "create-github-app")
	defer span.End()

	porterApp := &models.PorterApp{
		Name:           input.Name,
		ProjectID:      input.ProjectID,
		ClusterID:      input.ClusterID,
		GitRepoID:      input.GitRepoID,
		GitBranch:      input.GitBranch,
		RepoName:       input.GitRepoName,
		PorterYamlPath: input.PorterYamlPath,
	}

	porterApp, err := input.PorterAppRepository.CreatePorterApp(porterApp)
	if err != nil {
		return porterApp, telemetry.Error(ctx, span, err, "error creating porter app")
	}

	return porterApp, nil
}

func createDockerRegistryApp(ctx context.Context, input CreateDockerRegistryAppInput) (*models.PorterApp, error) {
	ctx, span := telemetry.NewSpan(ctx, "create-docker-registry-app")
	defer span.End()

	porterApp := &models.PorterApp{
		Name:         input.Name,
		ProjectID:    input.ProjectID,
		ClusterID:    input.ClusterID,
		ImageRepoURI: fmt.Sprintf("%s:%s", input.Repository, input.Tag),
	}

	porterApp, err := input.PorterAppRepository.CreatePorterApp(porterApp)
	if err != nil {
		return porterApp, telemetry.Error(ctx, span, err, "error creating porter app")
	}

	return porterApp, nil
}
