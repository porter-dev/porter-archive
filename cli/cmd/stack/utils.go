package stack

import (
	"context"
	"fmt"

	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/api/types"
	switchboardTypes "github.com/porter-dev/switchboard/pkg/types"
)

type MessageLevel string

const (
	Warning MessageLevel = "WARN"
	Error   MessageLevel = "ERR"
	Success MessageLevel = "OK"
	Info    MessageLevel = "INFO"
)

func composePreviewMessage(msg string, level MessageLevel) string {
	return fmt.Sprintf("[porter.yaml stack][%s] -- %s", level, msg)
}

func buildStackValues(apps *switchboardTypes.ResourceGroup) (map[string]interface{}, error) {
	values := make(map[string]interface{})

	for _, app := range apps.Resources {
		if app.Config == nil {
			continue
		}

		if helm_values, ok := app.Config["Values"]; ok {
			values[app.Name] = helm_values
		}
	}

	return values, nil
}

func buildStackDependencies(apps *switchboardTypes.ResourceGroup, client *api.Client, projectID uint) ([]types.Dependency, error) {
	deps := make([]types.Dependency, 0)

	for _, app := range apps.Resources {
		source, ok := app.Source["name"]
		if !ok {
			return nil, fmt.Errorf("app %s does not have a source", app.Name)
		}
		chartName, ok := source.(string)
		if !ok {
			return nil, fmt.Errorf("unable to parse source name for app %s", app.Name)
		}

		selectedRepo := "https://charts.getporter.dev"
		if repo, ok := app.Source["repo"]; ok {
			if repoName, ok := repo.(string); ok {
				selectedRepo = repoName
			}
		}

		selectedVersion, err := getLatestTemplateVersion(chartName, client, projectID)
		if err != nil {
			return nil, err
		}
		if version, ok := app.Source["version"]; ok {
			if versionName, ok := version.(string); ok {
				selectedVersion = versionName
			}
		}
		deps = append(deps, types.Dependency{
			Name:       chartName,
			Alias:      app.Name,
			Version:    selectedVersion,
			Repository: selectedRepo,
		})
	}

	return deps, nil
}

// getLatestTemplateVersion retrieves the latest template version for a specific
// Porter template from the chart repository.
func getLatestTemplateVersion(templateName string, client *api.Client, projectID uint) (string, error) {
	resp, err := client.ListTemplates(
		context.Background(),
		projectID,
		&types.ListTemplatesRequest{},
	)
	if err != nil {
		return "", err
	}

	templates := *resp

	var version string
	// find the matching template name
	for _, template := range templates {
		if templateName == template.Name {
			version = template.Versions[0]
			break
		}
	}

	if version == "" {
		return "", fmt.Errorf("matching template version not found")
	}

	return version, nil
}
