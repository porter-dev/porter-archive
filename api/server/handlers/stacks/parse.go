package stacks

import (
	"fmt"
	"strings"

	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/helm/loader"
	"github.com/porter-dev/porter/internal/templater/utils"
	"github.com/stefanmcshane/helm/pkg/chart"
	"gopkg.in/yaml.v2"
)

type PorterStackYAML struct {
	Version *string           `yaml:"version"`
	Build   *Build            `yaml:"build"`
	Env     map[string]string `yaml:"env"`
	Apps    map[string]*App   `yaml:"apps"`
	Release *string           `yaml:"release"`
}

type Build struct {
	Context    *string   `yaml:"context" validate:"dir"`
	Method     *string   `yaml:"method" validate:"required,oneof=pack docker registry"`
	Builder    *string   `yaml:"builder" validate:"required_if=Method pack"`
	Buildpacks []*string `yaml:"buildpacks"`
	Dockerfile *string   `yaml:"dockerfile" validate:"required_if=Method docker"`
	Image      *string   `yaml:"image" validate:"required_if=Method registry"`
}

type App struct {
	Run    *string                `yaml:"run" validate:"required"`
	Config map[string]interface{} `yaml:"config"`
	Type   *string                `yaml:"type" validate:"required, oneof=web worker job"`
}

func parse(porterYaml []byte, imageInfo types.ImageInfo, config *config.Config, projectID uint) (*chart.Chart, map[string]interface{}, error) {
	parsed := &PorterStackYAML{}

	err := yaml.Unmarshal(porterYaml, parsed)
	if err != nil {
		return nil, nil, fmt.Errorf("%s: %w", "error parsing porter.yaml", err)
	}

	values, err := buildStackValues(parsed, imageInfo)
	if err != nil {
		return nil, nil, fmt.Errorf("%s: %w", "error building values from porter.yaml", err)
	}
	convertedValues := convertMap(values)

	chart, err := buildStackChart(parsed, config, projectID)
	if err != nil {
		return nil, nil, fmt.Errorf("%s: %w", "error building chart from porter.yaml", err)
	}

	return chart, convertedValues.(map[string]interface{}), nil
}

func buildStackValues(parsed *PorterStackYAML, imageInfo types.ImageInfo) (map[string]interface{}, error) {
	values := make(map[string]interface{})

	for name, app := range parsed.Apps {
		appType := getType(name, app)
		defaultValues := getDefaultValues(app, parsed.Env, appType)
		helm_values := utils.CoalesceValues(defaultValues, app.Config)
		values[name] = helm_values
	}

	if imageInfo.Repository != "" && imageInfo.Tag != "" {
		values["global"] = map[string]interface{}{
			"image": map[string]interface{}{
				"repository": imageInfo.Repository,
				"tag":        imageInfo.Tag,
			},
		}
	}

	return values, nil
}

func getType(name string, app *App) string {
	if app.Type != nil {
		return *app.Type
	}
	if strings.Contains(name, "web") {
		return "web"
	}
	return "worker"
}

func getDefaultValues(app *App, env map[string]string, appType string) map[string]interface{} {
	var defaultValues map[string]interface{}
	var runCommand string
	if app.Run != nil {
		runCommand = *app.Run
	}
	if appType == "web" {
		defaultValues = map[string]interface{}{
			"ingress": map[string]interface{}{
				"enabled": false,
			},
			"container": map[string]interface{}{
				"command": runCommand,
				"env": map[string]interface{}{
					"normal": CopyEnv(env),
				},
			},
		}
	} else {
		defaultValues = map[string]interface{}{
			"container": map[string]interface{}{
				"command": runCommand,
				"env": map[string]interface{}{
					"normal": CopyEnv(env),
				},
			},
		}
	}
	return defaultValues
}

func buildStackChart(parsed *PorterStackYAML, config *config.Config, projectID uint) (*chart.Chart, error) {
	deps := make([]*chart.Dependency, 0)

	for alias, app := range parsed.Apps {
		appType := getType(alias, app)
		selectedRepo := config.ServerConf.DefaultApplicationHelmRepoURL
		selectedVersion, err := getLatestTemplateVersion(appType, config, projectID)
		if err != nil {
			return nil, err
		}
		deps = append(deps, &chart.Dependency{
			Name:       appType,
			Alias:      alias,
			Version:    selectedVersion,
			Repository: selectedRepo,
		})
	}

	chart, err := createChartFromDependencies(deps)
	if err != nil {
		return nil, err
	}

	return chart, nil
}

func createChartFromDependencies(deps []*chart.Dependency) (*chart.Chart, error) {
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

func convertMap(m interface{}) interface{} {
	switch m := m.(type) {
	case map[string]interface{}:
		for k, v := range m {
			m[k] = convertMap(v)
		}
	case map[interface{}]interface{}:
		result := map[string]interface{}{}
		for k, v := range m {
			result[k.(string)] = convertMap(v)
		}
		return result
	case []interface{}:
		for i, v := range m {
			m[i] = convertMap(v)
		}
	}
	return m
}

func CopyEnv(env map[string]string) map[string]string {
	envCopy := make(map[string]string)
	if env == nil {
		return envCopy
	}

	for k, v := range env {
		if k == "" || v == "" {
			continue
		}
		envCopy[k] = v
	}

	return envCopy
}
