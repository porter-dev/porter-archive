package porter_app

import (
	"context"
	"errors"
	"fmt"

	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"github.com/porter-dev/porter/internal/telemetry"
)

// ErrMissingSourceType is returned when the source type is not specified
var ErrMissingSourceType = errors.New("missing source type")

// SourceType is a string type specifying the source type of an app. This is specified in the incoming request
type SourceType string

const (
	// SourceType_Github is the source kind for a github repo
	SourceType_Github SourceType = "github"
	// SourceType_DockerRegistry is the source kind for an app using an image from a docker registry
	SourceType_DockerRegistry SourceType = "docker-registry"
	// SourceType_Local is the source kind for an app being built locally
	SourceType_Local SourceType = "other"
)

// Image is the image used by an app with a docker registry source
type Image struct {
	Repository string `json:"repository"`
	Tag        string `json:"tag"`
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

// CreateLocalAppInput is the input for creating an app that is built locally via the cli
type CreateLocalAppInput struct {
	ProjectID           uint
	ClusterID           uint
	Name                string
	PorterAppRepository repository.PorterAppRepository
}

// CreateOrGetAppRecordInput is the input to the CreateOrGetAppRecord function
type CreateOrGetAppRecordInput struct {
	ClusterID      uint
	ProjectID      uint
	Name           string
	SourceType     SourceType
	GitBranch      string
	GitRepoName    string
	GitRepoID      uint
	PorterYamlPath string
	Image          *Image

	PorterAppRepository repository.PorterAppRepository
}

// CreateOrGetAppRecord creates an app based on the input or gets an existing app if one is found with the provided name
func CreateOrGetAppRecord(ctx context.Context, input CreateOrGetAppRecordInput) (*types.PorterApp, error) {
	ctx, span := telemetry.NewSpan(ctx, "porter-app-create")
	defer span.End()

	var app *types.PorterApp

	if input.ClusterID == 0 {
		return app, telemetry.Error(ctx, span, nil, "cluster id is 0")
	}
	if input.ProjectID == 0 {
		return app, telemetry.Error(ctx, span, nil, "project id is 0")
	}
	if input.Name == "" {
		return app, telemetry.Error(ctx, span, nil, "name is empty")
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "project-id", Value: input.ProjectID},
		telemetry.AttributeKV{Key: "name", Value: input.Name},
	)

	porterAppDBEntries, err := input.PorterAppRepository.ReadPorterAppsByProjectIDAndName(input.ProjectID, input.Name)
	if err != nil {
		return app, telemetry.Error(ctx, span, err, "error reading porter apps by project id and name")
	}
	if len(porterAppDBEntries) > 1 {
		return app, telemetry.Error(ctx, span, nil, "multiple apps with same name")
	}

	// return existing app if one found with same name
	if len(porterAppDBEntries) == 1 {
		telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "existing-app-id", Value: porterAppDBEntries[0].ID})
		app = porterAppDBEntries[0].ToPorterAppType()
		return app, nil
	}

	switch input.SourceType {
	case SourceType_Github:
		if input.GitRepoID == 0 {
			return app, telemetry.Error(ctx, span, nil, "git repo id is 0")
		}
		if input.GitBranch == "" {
			return app, telemetry.Error(ctx, span, nil, "git branch is empty")
		}
		if input.GitRepoName == "" {
			return app, telemetry.Error(ctx, span, nil, "git repo name is empty")
		}

		telemetry.WithAttributes(span,
			telemetry.AttributeKV{Key: "git-repo-id", Value: input.GitRepoID},
			telemetry.AttributeKV{Key: "git-branch", Value: input.GitBranch},
			telemetry.AttributeKV{Key: "git-repo-name", Value: input.GitRepoName},
		)

		input := CreateGithubAppInput{
			ProjectID:           input.ProjectID,
			ClusterID:           input.ClusterID,
			Name:                input.Name,
			GitRepoID:           input.GitRepoID,
			GitBranch:           input.GitBranch,
			GitRepoName:         input.GitRepoName,
			PorterYamlPath:      input.PorterYamlPath,
			PorterAppRepository: input.PorterAppRepository,
		}

		githubApp, err := createGithubApp(ctx, input)
		if err != nil {
			return app, telemetry.Error(ctx, span, err, "error creating github app")
		}
		app = githubApp.ToPorterAppType()
	case SourceType_DockerRegistry:
		if input.Image == nil {
			return app, telemetry.Error(ctx, span, nil, "image is required")
		}

		telemetry.WithAttributes(span,
			telemetry.AttributeKV{Key: "image-repo-uri", Value: fmt.Sprintf("%s:%s", input.Image.Repository, input.Image.Tag)},
		)

		input := CreateDockerRegistryAppInput{
			ProjectID:           input.ProjectID,
			ClusterID:           input.ClusterID,
			Name:                input.Name,
			Repository:          input.Image.Repository,
			Tag:                 input.Image.Tag,
			PorterAppRepository: input.PorterAppRepository,
		}

		dockerApp, err := createDockerRegistryApp(ctx, input)
		if err != nil {
			return app, telemetry.Error(ctx, span, err, "error creating docker registry app")
		}
		app = dockerApp.ToPorterAppType()
	case SourceType_Local:
		input := CreateLocalAppInput{
			ProjectID:           input.ProjectID,
			ClusterID:           input.ClusterID,
			Name:                input.Name,
			PorterAppRepository: input.PorterAppRepository,
		}

		localApp, err := createLocalApp(ctx, input)
		if err != nil {
			return app, telemetry.Error(ctx, span, err, "error creating local app")
		}
		app = localApp.ToPorterAppType()
	default:
		return app, telemetry.Error(ctx, span, ErrMissingSourceType, "missing source type")
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "app-id", Value: app.ID})

	return app, nil
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

// createLocalApp creates an app that is built locally via the cli, usually frmo a git repo
// a local app will not have the same repo metadata as a github app
func createLocalApp(ctx context.Context, input CreateLocalAppInput) (*models.PorterApp, error) {
	ctx, span := telemetry.NewSpan(ctx, "create-local-app")
	defer span.End()

	porterApp := &models.PorterApp{
		Name:      input.Name,
		ProjectID: input.ProjectID,
		ClusterID: input.ClusterID,
	}

	porterApp, err := input.PorterAppRepository.CreatePorterApp(porterApp)
	if err != nil {
		return porterApp, telemetry.Error(ctx, span, err, "error creating porter app")
	}

	return porterApp, nil
}
