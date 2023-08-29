package v2

import (
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/porter-dev/porter/api/server/handlers/porter_app"

	"github.com/cli/cli/git"

	"github.com/fatih/color"
	"github.com/porter-dev/api-contracts/generated/go/helpers"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/cli/cmd/config"
)

// Apply implements the functionality of the `porter apply` command for validate apply v2 projects
func Apply(ctx context.Context, cliConf config.CLIConfig, client api.Client, porterYamlPath string) error {
	if len(porterYamlPath) == 0 {
		return fmt.Errorf("porter yaml is empty")
	}

	porterYaml, err := os.ReadFile(filepath.Clean(porterYamlPath))
	if err != nil {
		return fmt.Errorf("could not read porter yaml file: %w", err)
	}

	b64YAML := base64.StdEncoding.EncodeToString(porterYaml)

	parseResp, err := client.ParseYAML(ctx, cliConf.Project, cliConf.Cluster, b64YAML)
	if err != nil {
		return fmt.Errorf("error calling parse yaml endpoint: %w", err)
	}

	if parseResp.B64AppProto == "" {
		return errors.New("b64 app proto is empty")
	}

	appName, err := appNameFromB64AppProto(parseResp.B64AppProto)
	if err != nil {
		return fmt.Errorf("error getting app name from b64 app proto: %w", err)
	}

	color.New(color.FgGreen).Printf("Successfully parsed Porter YAML: applying app \"%s\"\n", appName) // nolint:errcheck,gosec

	targetResp, err := client.DefaultDeploymentTarget(ctx, cliConf.Project, cliConf.Cluster)
	if err != nil {
		return fmt.Errorf("error calling default deployment target endpoint: %w", err)
	}

	if targetResp.DeploymentTargetID == "" {
		return errors.New("deployment target id is empty")
	}

	var commitSHA string
	if os.Getenv("PORTER_COMMIT_SHA") != "" {
		commitSHA = os.Getenv("PORTER_COMMIT_SHA")
	} else if commit, err := git.LastCommit(); err == nil && commit != nil {
		commitSHA = commit.Sha
	}

	validateResp, err := client.ValidatePorterApp(ctx, cliConf.Project, cliConf.Cluster, parseResp.B64AppProto, targetResp.DeploymentTargetID, commitSHA)
	if err != nil {
		return fmt.Errorf("error calling validate endpoint: %w", err)
	}

	if validateResp.ValidatedBase64AppProto == "" {
		return errors.New("validated b64 app proto is empty")
	}
	base64AppProto := validateResp.ValidatedBase64AppProto

	createPorterAppDBEntryInp, err := createPorterAppDbEntryInputFromProtoAndEnv(validateResp.ValidatedBase64AppProto)
	if err != nil {
		return fmt.Errorf("error creating porter app db entry input from proto: %w", err)
	}

	err = client.CreatePorterAppDBEntry(ctx, cliConf.Project, cliConf.Cluster, createPorterAppDBEntryInp)
	if err != nil {
		return fmt.Errorf("error creating porter app db entry: %w", err)
	}

	base64AppProtoWithSubdomains, err := addPorterSubdomainsIfNecessary(ctx, client, cliConf.Project, cliConf.Cluster, base64AppProto)
	if err != nil {
		return fmt.Errorf("error creating subdomains: %w", err)
	}

	applyResp, err := client.ApplyPorterApp(ctx, cliConf.Project, cliConf.Cluster, base64AppProtoWithSubdomains, targetResp.DeploymentTargetID, "")
	if err != nil {
		return fmt.Errorf("error calling apply endpoint: %w", err)
	}

	if applyResp.AppRevisionId == "" {
		return errors.New("app revision id is empty")
	}

	if applyResp.CLIAction == porterv1.EnumCLIAction_ENUM_CLI_ACTION_BUILD {
		color.New(color.FgGreen).Printf("Building new image...\n") // nolint:errcheck,gosec

		if commitSHA == "" {
			return errors.New("Build is required but commit SHA cannot be identified. Please set the PORTER_COMMIT_SHA environment variable or run apply in git repository with access to the git CLI.")
		}

		buildSettings, err := buildSettingsFromBase64AppProto(base64AppProto)
		if err != nil {
			return fmt.Errorf("error building settings from base64 app proto: %w", err)
		}

		currentAppRevisionResp, err := client.CurrentAppRevision(ctx, cliConf.Project, cliConf.Cluster, appName, targetResp.DeploymentTargetID)
		if err != nil {
			return fmt.Errorf("error getting current app revision: %w", err)
		}

		if currentAppRevisionResp == nil {
			return errors.New("current app revision is nil")
		}

		appRevision := currentAppRevisionResp.AppRevision
		if appRevision.B64AppProto == "" {
			return errors.New("current app revision b64 app proto is empty")
		}

		currentImageTag, err := imageTagFromBase64AppProto(appRevision.B64AppProto)
		if err != nil {
			return fmt.Errorf("error getting image tag from current app revision: %w", err)
		}

		buildSettings.CurrentImageTag = currentImageTag
		buildSettings.ProjectID = cliConf.Project

		err = build(ctx, client, buildSettings)
		if err != nil {
			return fmt.Errorf("error building app: %w", err)
		}

		color.New(color.FgGreen).Printf("Successfully built image (tag: %s)\n", buildSettings.ImageTag) // nolint:errcheck,gosec

		applyResp, err = client.ApplyPorterApp(ctx, cliConf.Project, cliConf.Cluster, "", "", applyResp.AppRevisionId)
		if err != nil {
			return fmt.Errorf("apply error post-build: %w", err)
		}
	}

	if applyResp.CLIAction == porterv1.EnumCLIAction_ENUM_CLI_ACTION_TRACK_PREDEPLOY {
		color.New(color.FgGreen).Printf("Waiting for predeploy to complete...\n") // nolint:errcheck,gosec

		now := time.Now().UTC()
		for {
			if time.Since(now) > 60*time.Minute {
				break
			}

			predeployStatusResp, err := client.PredeployStatus(ctx, cliConf.Project, cliConf.Cluster, appName, applyResp.AppRevisionId)
			if err != nil {
				return fmt.Errorf("error calling predeploy status endpoint: %w", err)
			}

			if predeployStatusResp.Status == porter_app.PredeployStatus_Failed || predeployStatusResp.Status == porter_app.PredeployStatus_Successful {
				break
			}

			time.Sleep(10 * time.Second)
		}

		applyResp, err = client.ApplyPorterApp(ctx, cliConf.Project, cliConf.Cluster, "", "", applyResp.AppRevisionId)
		if err != nil {
			return fmt.Errorf("apply error post-predeploy: %w", err)
		}
	}

	if applyResp.CLIAction != porterv1.EnumCLIAction_ENUM_CLI_ACTION_NONE {
		return fmt.Errorf("unexpected CLI action: %s", applyResp.CLIAction)
	}

	color.New(color.FgGreen).Printf("Successfully applied new revision %s for app %s\n", applyResp.AppRevisionId, appName) // nolint:errcheck,gosec
	return nil
}

func appNameFromB64AppProto(base64AppProto string) (string, error) {
	decoded, err := base64.StdEncoding.DecodeString(base64AppProto)
	if err != nil {
		return "", fmt.Errorf("unable to decode base64 app for revision: %w", err)
	}

	app := &porterv1.PorterApp{}
	err = helpers.UnmarshalContractObject(decoded, app)
	if err != nil {
		return "", fmt.Errorf("unable to unmarshal app for revision: %w", err)
	}

	if app.Name == "" {
		return "", fmt.Errorf("app does not contain name")
	}
	return app.Name, nil
}

func createPorterAppDbEntryInputFromProtoAndEnv(base64AppProto string) (api.CreatePorterAppDBEntryInput, error) {
	var input api.CreatePorterAppDBEntryInput

	decoded, err := base64.StdEncoding.DecodeString(base64AppProto)
	if err != nil {
		return input, fmt.Errorf("unable to decode base64 app for revision: %w", err)
	}

	app := &porterv1.PorterApp{}
	err = helpers.UnmarshalContractObject(decoded, app)
	if err != nil {
		return input, fmt.Errorf("unable to unmarshal app for revision: %w", err)
	}

	if app.Name == "" {
		return input, fmt.Errorf("app does not contain name")
	}
	input.AppName = app.Name

	if app.Build != nil {
		if os.Getenv("GITHUB_REPOSITORY_ID") == "" {
			input.Local = true
			return input, nil
		}
		gitRepoId, err := strconv.Atoi(os.Getenv("GITHUB_REPOSITORY_ID"))
		if err != nil {
			return input, fmt.Errorf("unable to parse GITHUB_REPOSITORY_ID to int: %w", err)
		}
		input.GitRepoID = uint(gitRepoId)
		input.GitRepoName = os.Getenv("GITHUB_REPOSITORY")
		input.GitBranch = os.Getenv("GITHUB_REF_NAME")
		input.PorterYamlPath = "porter.yaml"
		return input, nil
	}

	if app.Image != nil {
		input.ImageRepository = app.Image.Repository
		input.ImageTag = app.Image.Tag
		return input, nil
	}

	return input, fmt.Errorf("app does not contain build or image settings")
}

func addPorterSubdomainsIfNecessary(ctx context.Context, client api.Client, project uint, cluster uint, base64AppProto string) (string, error) {
	var editedB64AppProto string

	decoded, err := base64.StdEncoding.DecodeString(base64AppProto)
	if err != nil {
		return editedB64AppProto, fmt.Errorf("unable to decode base64 app for revision: %w", err)
	}

	app := &porterv1.PorterApp{}
	err = helpers.UnmarshalContractObject(decoded, app)
	if err != nil {
		return editedB64AppProto, fmt.Errorf("unable to unmarshal app for revision: %w", err)
	}

	for serviceName, service := range app.Services {
		if service.Type == porterv1.ServiceType_SERVICE_TYPE_WEB {
			if service.GetWebConfig() == nil {
				return editedB64AppProto, fmt.Errorf("web service %s does not contain web config", serviceName)
			}

			webConfig := service.GetWebConfig()

			if !webConfig.Private && len(webConfig.Domains) == 0 {
				color.New(color.FgYellow).Printf("Service %s is public but does not contain any domains, creating Porter domain\n", serviceName) // nolint:errcheck,gosec
				domain, err := client.CreateSubdomain(ctx, project, cluster, app.Name, serviceName)
				if err != nil {
					return editedB64AppProto, fmt.Errorf("error creating subdomain: %w", err)
				}

				if domain.Subdomain == "" {
					return editedB64AppProto, errors.New("response subdomain is empty")
				}

				webConfig.Domains = []*porterv1.Domain{
					{Name: domain.Subdomain},
				}

				service.Config = &porterv1.Service_WebConfig{WebConfig: webConfig}
			}
		}
	}

	marshalled, err := helpers.MarshalContractObject(ctx, app)
	if err != nil {
		return editedB64AppProto, fmt.Errorf("unable to marshal app back to json: %w", err)
	}

	editedB64AppProto = base64.StdEncoding.EncodeToString(marshalled)

	return editedB64AppProto, nil
}

func buildSettingsFromBase64AppProto(base64AppProto string) (buildInput, error) {
	var buildSettings buildInput

	decoded, err := base64.StdEncoding.DecodeString(base64AppProto)
	if err != nil {
		return buildSettings, fmt.Errorf("unable to decode base64 app for revision: %w", err)
	}

	app := &porterv1.PorterApp{}
	err = helpers.UnmarshalContractObject(decoded, app)
	if err != nil {
		return buildSettings, fmt.Errorf("unable to unmarshal app for revision: %w", err)
	}

	if app.Name == "" {
		return buildSettings, fmt.Errorf("app does not contain name")
	}

	if app.Build == nil {
		return buildSettings, fmt.Errorf("app does not contain build settings")
	}

	if app.Image == nil {
		return buildSettings, fmt.Errorf("app does not contain image settings")
	}

	return buildInput{
		AppName:       app.Name,
		BuildContext:  app.Build.Context,
		Dockerfile:    app.Build.Dockerfile,
		BuildMethod:   app.Build.Method,
		Builder:       app.Build.Builder,
		BuildPacks:    app.Build.Buildpacks,
		ImageTag:      app.Image.Tag,
		RepositoryURL: app.Image.Repository,
	}, nil
}

func imageTagFromBase64AppProto(base64AppProto string) (string, error) {
	var image string

	decoded, err := base64.StdEncoding.DecodeString(base64AppProto)
	if err != nil {
		return image, fmt.Errorf("unable to decode base64 app for revision: %w", err)
	}

	app := &porterv1.PorterApp{}
	err = helpers.UnmarshalContractObject(decoded, app)
	if err != nil {
		return image, fmt.Errorf("unable to unmarshal app for revision: %w", err)
	}

	if app.Image == nil {
		return image, fmt.Errorf("app does not contain image settings")
	}

	if app.Image.Tag == "" {
		return image, fmt.Errorf("app does not contain image tag")
	}

	return app.Image.Tag, nil
}
