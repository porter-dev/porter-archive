package v2

import (
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"os"
	"path/filepath"

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

	targetResp, err := client.DefaultDeploymentTarget(ctx, cliConf.Project, cliConf.Cluster)
	if err != nil {
		return fmt.Errorf("error calling default deployment target endpoint: %w", err)
	}

	if targetResp.DeploymentTargetID == "" {
		return errors.New("deployment target id is empty")
	}

	validateResp, err := client.ValidatePorterApp(ctx, cliConf.Project, cliConf.Cluster, parseResp.B64AppProto, targetResp.DeploymentTargetID)
	if err != nil {
		return fmt.Errorf("error calling validate endpoint: %w", err)
	}

	if validateResp.ValidatedBase64AppProto == "" {
		return errors.New("validated b64 app proto is empty")
	}
	base64AppProto := validateResp.ValidatedBase64AppProto

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
		buildSettings, err := buildSettingsFromBase64AppProto(base64AppProto)
		if err != nil {
			return fmt.Errorf("error building settings from base64 app proto: %w", err)
		}

		currentAppRevisionResp, err := client.CurrentAppRevision(ctx, cliConf.Project, cliConf.Cluster, buildSettings.AppName, targetResp.DeploymentTargetID)
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

		applyResp, err = client.ApplyPorterApp(ctx, cliConf.Project, cliConf.Cluster, "", "", applyResp.AppRevisionId)
		if err != nil {
			return fmt.Errorf("error calling apply endpoint after build: %w", err)
		}
	}

	if applyResp.CLIAction != porterv1.EnumCLIAction_ENUM_CLI_ACTION_NONE {
		return fmt.Errorf("unexpected CLI action: %s", applyResp.CLIAction)
	}

	color.New(color.FgGreen).Printf("Successfully applied Porter YAML as revision %v, next action: %v\n", applyResp.AppRevisionId, applyResp.CLIAction) // nolint:errcheck,gosec
	return nil
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
