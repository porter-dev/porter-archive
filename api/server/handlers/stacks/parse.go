package stacks

import (
	"fmt"

	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	stack "github.com/porter-dev/porter/cli/cmd/stack"
	"github.com/porter-dev/porter/internal/helm/loader"
	"github.com/porter-dev/porter/internal/templater/utils"
	"github.com/stefanmcshane/helm/pkg/chart"
	"gopkg.in/yaml.v2"
)

func parse(porterYaml string, imageInfo *types.ImageInfo, config *config.Config, projectID uint) (*chart.Chart, map[string]interface{}, error) {
	parsed := &stack.PorterStackYAML{}

	err := yaml.Unmarshal([]byte(porterYaml), parsed)
	if err != nil {
		return nil, nil, fmt.Errorf("%s: %w", "error parsing porter.yaml", err)
	}

	values, err := buildStackValues(parsed, imageInfo)
	if err != nil {
		return nil, nil, fmt.Errorf("%s: %w", "error building values from porter.yaml", err)
	}

	chart, err := buildStackChart(parsed, config, projectID)
	if err != nil {
		return nil, nil, fmt.Errorf("%s: %w", "error building chart from porter.yaml", err)
	}

	return chart, values, nil
}

func buildStackValues(parsed *stack.PorterStackYAML, imageInfo *types.ImageInfo) (map[string]interface{}, error) {
	values := make(map[string]interface{})

	for name, app := range parsed.Apps {
		defaultValues := getDefaultValues(app, parsed.Env, imageInfo)
		helm_values := utils.CoalesceValues(defaultValues, app.Config)
		values[name] = helm_values
	}

	return values, nil
}

func getDefaultValues(app *stack.App, env map[string]string, imageInfo *types.ImageInfo) map[string]interface{} {
	var defaultValues map[string]interface{}
	if *app.Type == "web" {
		defaultValues = map[string]interface{}{
			"ingress": map[string]interface{}{
				"enabled": false,
			},
			"container": map[string]interface{}{
				"command": *app.Run,
				"env": map[string]interface{}{
					"normal": stack.CopyEnv(env),
				},
			},
		}
	} else {
		defaultValues = map[string]interface{}{
			"container": map[string]interface{}{
				"command": *app.Run,
				"env": map[string]interface{}{
					"normal": stack.CopyEnv(env),
				},
			},
		}
	}
	if imageInfo != nil {
		defaultValues["image"] = map[string]interface{}{
			"repository": imageInfo.Repository,
			"tag":        imageInfo.Tag,
		}
	}
	return defaultValues
}

func buildStackChart(parsed *stack.PorterStackYAML, config *config.Config, projectID uint) (*chart.Chart, error) {
	deps := make([]*chart.Dependency, 0)

	for alias, app := range parsed.Apps {
		selectedRepo := "https://charts.getporter.dev"
		selectedVersion, err := getLatestTemplateVersion(*app.Type, config, projectID)
		if err != nil {
			return nil, err
		}
		deps = append(deps, &chart.Dependency{
			Name:       *app.Type,
			Alias:      alias,
			Version:    selectedVersion,
			Repository: selectedRepo,
		})
	}

	chart, err := createChartFromDependencies2(deps)
	if err != nil {
		return nil, err
	}

	return chart, nil
}

func createChartFromDependencies2(deps []*chart.Dependency) (*chart.Chart, error) {
	metadata := &chart.Metadata{
		Name:        "umbrella",
		Description: "Web application that is exposed to external traffic.",
		Version:     "0.96.0",
		APIVersion:  "v2",
		Home:        "https://getporter.dev/",
		Icon:        "https://user-images.githubusercontent.com/65516095/111255214-07d3da80-85ed-11eb-99e2-fddcbdb99bdb.png",
		Keywords: []string{
			"porter",
			"application",
			"service",
			"umbrella",
		},
		Type:         "application",
		Dependencies: deps,
	}

	// create a new chart object with the metadata
	c := &chart.Chart{
		Metadata: metadata,
	}
	return c, nil
}

func getLatestTemplateVersion(templateName string, config *config.Config, projectID uint) (string, error) {
	repoIndex, err := loader.LoadRepoIndexPublic(config.ServerConf.DefaultApplicationHelmRepoURL)
	if err != nil {
		return "", fmt.Errorf("%s: %w", "unable to load porter chart repo", err)
	}
	templates := loader.RepoIndexToPorterChartList(repoIndex, config.ServerConf.DefaultApplicationHelmRepoURL)
	if err != nil {
		return "", fmt.Errorf("%s: %w", "unable to load porter chart list", err)
	}

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
