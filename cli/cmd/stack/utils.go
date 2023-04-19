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

func GetEnv(raw map[*string]*string) map[string]string {
	env := make(map[string]string)

	for k, v := range raw {
		if k == nil || v == nil {
			continue
		}

		env[*k] = *v
	}

	return env
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

// coalesceValues replaces arrays and scalar values, merges maps
func CoalesceValues(base, override map[string]interface{}) map[string]interface{} {
	if base == nil && override != nil {
		return override
	} else if override == nil {
		return base
	}

	for key, val := range base {
		if oVal, ok := override[key]; ok {
			if oVal == nil {
				delete(override, key)
			} else if isYAMLTable(oVal) && isYAMLTable(val) {
				oMapVal, _ := oVal.(map[string]interface{})
				bMapVal, _ := val.(map[string]interface{})

				override[key] = mergeMaps(bMapVal, oMapVal)
			}
		} else {
			override[key] = val
		}
	}

	return override
}

func isYAMLTable(v interface{}) bool {
	_, ok := v.(map[string]interface{})
	return ok
}

// mergeMaps merges any number of maps together, with maps later in the slice taking
// precedent
func mergeMaps(maps ...map[string]interface{}) map[string]interface{} {
	// merge bottom-up
	if len(maps) > 2 {
		mLen := len(maps)
		newMaps := maps[0 : mLen-2]

		// reduce length of maps by 1 and merge again
		newMaps = append(newMaps, mergeMaps(maps[mLen-2], maps[mLen-1]))
		return mergeMaps(newMaps...)
	} else if len(maps) == 2 {
		if maps[0] == nil {
			return maps[1]
		}

		if maps[1] == nil {
			return maps[0]
		}

		for key, map0Val := range maps[0] {
			if map1Val, ok := maps[1][key]; ok && map1Val == nil {
				delete(maps[1], key)
			} else if !ok {
				maps[1][key] = map0Val
			} else if isYAMLTable(map0Val) {
				if isYAMLTable(map1Val) {
					mergeMaps(map0Val.(map[string]interface{}), map1Val.(map[string]interface{}))
				}
			}
		}

		return maps[1]
	} else if len(maps) == 1 {
		return maps[0]
	}

	return nil
}
