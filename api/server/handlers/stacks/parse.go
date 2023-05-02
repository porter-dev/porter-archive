package stacks

import (
	"fmt"
	"strings"

	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/helm/loader"
	"github.com/porter-dev/porter/internal/integrations/powerdns"
	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/kubernetes/domain"
	"github.com/porter-dev/porter/internal/repository"
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

type SubdomainCreateOpts struct {
	k8sAgent       *kubernetes.Agent
	dnsRepo        repository.DNSRecordRepository
	powerDnsClient *powerdns.Client
	appRootDomain  string
	stackName      string
}

func parse(porterYaml []byte, imageInfo types.ImageInfo, config *config.Config, projectID uint, opts SubdomainCreateOpts) (*chart.Chart, map[string]interface{}, error) {
	parsed := &PorterStackYAML{}

	err := yaml.Unmarshal(porterYaml, parsed)
	if err != nil {
		return nil, nil, fmt.Errorf("%s: %w", "error parsing porter.yaml", err)
	}

	values, err := buildStackValues(parsed, imageInfo, opts)
	if err != nil {
		return nil, nil, fmt.Errorf("%s: %w", "error building values from porter.yaml", err)
	}
	convertedValues := convertMap(values).(map[string]interface{})

	chart, err := buildStackChart(parsed, config, projectID)
	if err != nil {
		return nil, nil, fmt.Errorf("%s: %w", "error building chart from porter.yaml", err)
	}

	return chart, convertedValues, nil
}

func buildStackValues(parsed *PorterStackYAML, imageInfo types.ImageInfo, opts SubdomainCreateOpts) (map[string]interface{}, error) {
	values := make(map[string]interface{})

	for name, app := range parsed.Apps {
		appType := getType(name, app)
		defaultValues := getDefaultValues(app, parsed.Env, appType)
		convertedConfig := convertMap(app.Config).(map[string]interface{})
		helm_values := utils.DeepCoalesceValues(defaultValues, convertedConfig)
		err := createSubdomainIfRequired(helm_values, opts) // modifies helm_values to add subdomains if necessary
		if err != nil {
			return nil, err
		}
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

func createSubdomainIfRequired(
	mergedValues map[string]interface{},
	opts SubdomainCreateOpts,
) error {
	// look for ingress.enabled and no custom domains set
	ingressMap, err := getNestedMap(mergedValues, "ingress")
	if err == nil {
		enabledVal, enabledExists := ingressMap["enabled"]
		customDomVal, customDomExists := ingressMap["custom_domain"]

		if enabledExists && customDomExists {
			enabled, eOK := enabledVal.(bool)
			customDomain, cOK := customDomVal.(bool)

			if eOK && cOK && enabled && !customDomain {
				// in the case of ingress enabled but no custom domain, create subdomain
				dnsRecord, err := createDNSRecord(opts)
				if err != nil {
					return fmt.Errorf("error creating subdomain: %s", err.Error())
				}

				subdomain := dnsRecord.ExternalURL

				if ingressVal, ok := mergedValues["ingress"]; !ok {
					mergedValues["ingress"] = map[string]interface{}{
						"porter_hosts": []string{
							subdomain,
						},
					}
				} else {
					ingressValMap := ingressVal.(map[string]interface{})

					ingressValMap["porter_hosts"] = []string{
						subdomain,
					}
				}
			}
		}
	}

	return nil
}

func createDNSRecord(opts SubdomainCreateOpts) (*types.DNSRecord, error) {
	endpoint, found, err := domain.GetNGINXIngressServiceIP(opts.k8sAgent.Clientset)
	if err != nil {
		return nil, err
	}
	if !found {
		return nil, fmt.Errorf("target cluster does not have nginx ingress")
	}

	createDomain := domain.CreateDNSRecordConfig{
		ReleaseName: opts.stackName,
		RootDomain:  opts.appRootDomain,
		Endpoint:    endpoint,
	}

	record := createDomain.NewDNSRecordForEndpoint()

	record, err = opts.dnsRepo.CreateDNSRecord(record)

	if err != nil {
		return nil, err
	}

	_record := domain.DNSRecord(*record)

	err = _record.CreateDomain(opts.powerDnsClient)

	if err != nil {
		return nil, err
	}

	return record.ToDNSRecordType(), nil
}

func getNestedMap(obj map[string]interface{}, fields ...string) (map[string]interface{}, error) {
	var res map[string]interface{}
	curr := obj

	for _, field := range fields {
		objField, ok := curr[field]

		if !ok {
			return nil, fmt.Errorf("%s not found", field)
		}

		res, ok = objField.(map[string]interface{})

		if !ok {
			return nil, fmt.Errorf("%s is not a nested object", field)
		}

		curr = res
	}

	return res, nil
}
