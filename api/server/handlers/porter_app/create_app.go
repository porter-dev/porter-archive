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

type EnumSourceType int32

const (
	EnumSourceType_Unspecified EnumSourceType = iota
	EnumSourceType_Github
	EnumSourceType_DockerRegistry
)

type SourceKind string

const (
	SourceKindGithub         SourceKind = "github"
	SourceKindDockerRegistry SourceKind = "docker-registry"
)

type Image struct {
	Repository string `json:"repository"`
	Tag        string `json:"tag"`
}

// CreateAppRequest is the request object for the /apps/create endpoint
type CreateAppRequest struct {
	Name           string     `json:"name"`
	EnumSourceType SourceKind `json:"source_type"`
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

	if request.EnumSourceType == "" {
		err := telemetry.Error(ctx, span, nil, "source type is required")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	source, err := sourceEnumFromType(request.EnumSourceType)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error getting source type")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	var porterApp models.PorterApp
	switch source {
	case EnumSourceType_Github:
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

		porterApp, err = createGithubApp(ctx, input)
		if err != nil {
			err := telemetry.Error(ctx, span, err, "error creating github app")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}
	case EnumSourceType_DockerRegistry:
		if request.Image == nil {
			err := telemetry.Error(ctx, span, nil, "image is required")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
			return
		}

		input := CreateDockerRegistryAppInput{
			ProjectID:           project.ID,
			ClusterID:           cluster.ID,
			Name:                request.Name,
			Repository:          request.Image.Repository,
			Tag:                 request.Image.Tag,
			PorterAppRepository: c.Repo().PorterApp(),
		}

		porterApp, err = createDockerRegistryApp(ctx, input)
		if err != nil {
			err := telemetry.Error(ctx, span, err, "error creating docker registry app")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}
	default:
		err := telemetry.Error(ctx, span, nil, "source type not supported")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "app-id", Value: porterApp.ID})

	c.WriteResult(w, r, porterApp.ToPorterAppType())
}

func createGithubApp(ctx context.Context, input CreateGithubAppInput) (models.PorterApp, error) {
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
		return *porterApp, telemetry.Error(ctx, span, err, "error creating porter app")
	}

	return *porterApp, nil
}

func createDockerRegistryApp(ctx context.Context, input CreateDockerRegistryAppInput) (models.PorterApp, error) {
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
		return *porterApp, telemetry.Error(ctx, span, err, "error creating porter app")
	}

	return *porterApp, nil
}

func sourceEnumFromType(sourceType SourceKind) (EnumSourceType, error) {
	switch sourceType {
	case SourceKindGithub:
		return EnumSourceType_Github, nil
	case SourceKindDockerRegistry:
		return EnumSourceType_DockerRegistry, nil
	default:
		return EnumSourceType_Unspecified, fmt.Errorf("invalid source type: %s", sourceType)
	}
}
