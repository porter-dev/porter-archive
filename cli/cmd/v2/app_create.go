package v2

import (
	"context"
	"errors"
	"fmt"

	"github.com/charmbracelet/huh"
	"github.com/fatih/color"
	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/cli/cmd/config"
	v2 "github.com/porter-dev/porter/internal/porter_app/v2"
)

// AppDeployMethod is the deployment method for the app
type AppDeployMethod string

const (
	// AppDeployMethod_Repo is the deployment method when source code is in a git repository and built on apply
	AppDeployMethod_Repo AppDeployMethod = "repo"
	// AppDeployMethod_Docker is the deployment method when app is sourced from a docker image
	AppDeployMethod_Docker AppDeployMethod = "docker"
)

const herokuDefaultBuilder = "heroku/buildpacks:20"

// CreateAppInput is the input for the CreateApp function
type CreateAppInput struct {
	CLIConfig config.CLIConfig
	// Client is the Porter API client
	Client api.Client
	// AppName is the name of the app. If not provided, the user will be prompted to provide one
	AppName string
	// DeploymentMethod is the deployment method for the app, either 'repo' or 'docker'
	DeploymentMethod string
	// PorterYamlPath is the path to the porter.yaml file.
	PorterYamlPath string
	// DeploymentTargetName is the name of the deployment target, if provided
	DeploymentTargetName string
	// BuildMethod is the build method for the app on apply, either 'docker' or 'pack'
	BuildMethod string
	// Dockerfile is the path to the Dockerfile when build method is 'docker'
	Dockerfile string
	// Builder is the builder to use when build method is 'pack'
	Builder string
	// Buildpacks is the buildpacks to use when build method is 'pack'
	Buildpacks []string
	// BuildContext is the build context for the app, e.g. ./app
	BuildContext string
	// ImageTag is the image tag to use for the app build
	ImageTag string
	// ImageRepo is the image repository to use for the app build
	ImageRepo string
	// EnvGroups is a list of any env groups to attach to the app
	EnvGroups []string
}

// CreateApp creates a new app in the Porter project, either from a Porter YAML file or through a form
func CreateApp(ctx context.Context, inp CreateAppInput) error {
	if inp.PorterYamlPath == "" {
		err := createWithForm(&inp)
		if err != nil {
			if !errors.Is(err, huh.ErrUserAborted) {
				return err
			}

			return nil
		}
	}

	var builder string
	if inp.BuildMethod == "pack" {
		builder = herokuDefaultBuilder
	}

	patchOps := v2.PatchOperationsFromFlagValues(v2.PatchOperationsFromFlagValuesInput{
		EnvGroups:       inp.EnvGroups,
		BuildMethod:     inp.BuildMethod,
		Builder:         builder,
		BuildContext:    inp.BuildContext,
		Buildpacks:      inp.Buildpacks,
		Dockerfile:      inp.Dockerfile,
		ImageRepository: inp.ImageRepo,
		ImageTag:        inp.ImageTag,
	})

	err := Apply(ctx, ApplyInput{
		CLIConfig:        inp.CLIConfig,
		Client:           inp.Client,
		PorterYamlPath:   inp.PorterYamlPath,
		AppName:          inp.AppName,
		ImageTagOverride: inp.ImageTag,
		PatchOperations:  patchOps,
	})
	if err != nil {
		return fmt.Errorf("error applying app: %w", err)
	}

	return nil
}

func createWithForm(inp *CreateAppInput) error {
	color.New(color.FgGreen).Printf("Creating a new app\n\n")                                    // nolint:errcheck,gosec
	color.New(color.FgBlue).Println("Get started by providing some information about your app.") // nolint:errcheck,gosec

	var formGroups []*huh.Group
	if inp.AppName == "" {
		formGroups = append(formGroups, WithNameOption(inp))
	}

	var deployMethod AppDeployMethod
	if inp.DeploymentMethod != "" {
		method, err := validDeployMethod(inp.DeploymentMethod)
		if err != nil {
			return fmt.Errorf("error getting deployment method: %w", err)
		}
		deployMethod = method
	}
	if deployMethod == "" {
		formGroups = append(formGroups, WithDeployMethodOption(inp))
	}

	if inp.BuildContext == "" {
		formGroups = append(formGroups, WithBuildContextOption(inp))
	}

	if inp.BuildMethod == "" {
		formGroups = append(formGroups, WithBuildMethodOption(inp))

		if inp.Dockerfile == "" {
			formGroups = append(formGroups, WithDockerfileOption(inp))
		}
		if len(inp.Buildpacks) == 0 {
			formGroups = append(formGroups, WithBuildpackOptions(inp))
		}
	}

	if inp.ImageRepo == "" || inp.ImageTag == "" {
		formGroups = append(formGroups, WithImageOptions(inp))
	}

	if len(formGroups) > 0 {
		form := huh.NewForm(formGroups...)
		err := form.Run()
		if err != nil {
			return err
		}
	}

	return nil
}

// CreateAppFormOption is a functional option for configuring the CreateAppInput through a form
type CreateAppFormOption func(*CreateAppInput) *huh.Group

// WithNameOption returns a form group for the app name
func WithNameOption(inp *CreateAppInput) *huh.Group {
	return huh.NewGroup(
		huh.NewInput().Title("App Name").CharLimit(31).Value(&inp.AppName),
	)
}

// WithDeployMethodOption returns a form group for the deployment method
func WithDeployMethodOption(inp *CreateAppInput) *huh.Group {
	return huh.NewGroup(
		huh.NewSelect[string]().Title("Deployment Method").Options(
			huh.NewOption("Docker", "docker"),
			huh.NewOption("From Repository", "repo"),
		).Value(&inp.DeploymentMethod),
	)
}

// WithBuildContextOption returns a form group for the build context
func WithBuildContextOption(inp *CreateAppInput) *huh.Group {
	return huh.NewGroup(
		huh.NewInput().Title("Build Context").Value(&inp.BuildContext),
	).WithHideFunc(func() bool {
		return inp.DeploymentMethod != string(AppDeployMethod_Repo)
	})
}

// WithBuildMethodOption returns a form group for the build method
func WithBuildMethodOption(inp *CreateAppInput) *huh.Group {
	return huh.NewGroup(
		huh.NewSelect[string]().Title("Build Method").Options(
			huh.NewOption("Dockerfile", "docker"),
			huh.NewOption("Buildpacks", "pack"),
		).Value(&inp.BuildMethod),
	).WithHideFunc(func() bool {
		return inp.DeploymentMethod != string(AppDeployMethod_Repo)
	})
}

// WithBuildpackOptions returns a form group for the buildpack options
func WithBuildpackOptions(inp *CreateAppInput) *huh.Group {
	return huh.NewGroup(
		huh.NewMultiSelect[string]().Title("Buildpacks").Options(
			huh.NewOption("Node.js", "heroku/nodejs"),
			huh.NewOption("Ruby", "heroku/ruby"),
			huh.NewOption("Python", "heroku/python"),
			huh.NewOption("Go", "heroku/go"),
			huh.NewOption("Java", "heroku/java"),
		).Value(&inp.Buildpacks),
	).WithHideFunc(func() bool {
		return inp.BuildMethod != "pack"
	})
}

// WithDockerfileOption returns a form group for the Dockerfile path
func WithDockerfileOption(inp *CreateAppInput) *huh.Group {
	return huh.NewGroup(
		huh.NewInput().Title("Dockerfile Path").Value(&inp.Dockerfile),
	).WithHideFunc(func() bool {
		return inp.BuildMethod != "docker"
	})
}

// WithImageOptions returns a form group for the image repository and tag
func WithImageOptions(inp *CreateAppInput) *huh.Group {
	return huh.NewGroup(
		huh.NewInput().Title("Image Repository").Value(&inp.ImageRepo),
		huh.NewInput().Title("Image Tag").Value(&inp.ImageTag),
	).WithHideFunc(func() bool {
		return inp.DeploymentMethod != string(AppDeployMethod_Docker)
	})
}

func validDeployMethod(m string) (AppDeployMethod, error) {
	var method AppDeployMethod

	switch m {
	case string(AppDeployMethod_Repo):
		method = AppDeployMethod_Repo
	case string(AppDeployMethod_Docker):
		method = AppDeployMethod_Docker
	default:
		return method, fmt.Errorf("invalid deployment method: %s", method)
	}

	return method, nil
}
