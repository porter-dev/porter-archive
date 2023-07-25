package porter_app

import (
	"context"
	"fmt"
	"reflect"
	"strconv"
	"strings"

	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/helm/loader"
	"github.com/porter-dev/porter/internal/integrations/powerdns"
	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/kubernetes/domain"
	"github.com/porter-dev/porter/internal/kubernetes/environment_groups"
	"github.com/porter-dev/porter/internal/repository"
	"github.com/porter-dev/porter/internal/templater/utils"
	"github.com/stefanmcshane/helm/pkg/chart"

	"gopkg.in/yaml.v2"
)

type PorterStackYAML struct {
	Applications map[string]*Application `yaml:"applications" validate:"required_without=Services Apps"`
	Version      *string                 `yaml:"version"`
	Build        *Build                  `yaml:"build"`
	Env          map[string]string       `yaml:"env"`
	SyncedEnv    []*SyncedEnvSection     `yaml:"synced_env"`
	Apps         map[string]*Service     `yaml:"apps" validate:"required_without=Applications Services"`
	Services     map[string]*Service     `yaml:"services" validate:"required_without=Applications Apps"`

	Release *Service `yaml:"release"`
}

type Application struct {
	Services map[string]*Service `yaml:"services" validate:"required"`
	Build    *Build              `yaml:"build"`
	Env      map[string]string   `yaml:"env"`

	Release *Service `yaml:"release"`
}

type Build struct {
	Context    *string   `yaml:"context" validate:"dir"`
	Method     *string   `yaml:"method" validate:"required,oneof=pack docker registry"`
	Builder    *string   `yaml:"builder" validate:"required_if=Method pack"`
	Buildpacks []*string `yaml:"buildpacks"`
	Dockerfile *string   `yaml:"dockerfile" validate:"required_if=Method docker"`
	Image      *string   `yaml:"image" validate:"required_if=Method registry"`
}

type Service struct {
	Run    *string                `yaml:"run"`
	Config map[string]interface{} `yaml:"config"`
	Type   *string                `yaml:"type" validate:"required, oneof=web worker job"`
}

type SyncedEnvSection struct {
	Name    string                `json:"name" yaml:"name"`
	Version uint                  `json:"version" yaml:"version"`
	Keys    []SyncedEnvSectionKey `json:"keys" yaml:"keys"`
}

type SyncedEnvSectionKey struct {
	Name   string `json:"name" yaml:"name"`
	Secret bool   `json:"secret" yaml:"secret"`
}

type SubdomainCreateOpts struct {
	k8sAgent       *kubernetes.Agent
	dnsRepo        repository.DNSRecordRepository
	powerDnsClient *powerdns.Client
	appRootDomain  string
	stackName      string
}

type ParseConf struct {
	// PorterYaml is the raw porter yaml which is used to build the values + chart for helm upgrade
	PorterYaml []byte
	// ImageInfo contains the repository and tag of the image to use for the helm upgrade. Kept separate from the PorterYaml because the image info
	// is stored in the 'global' key of the values, which is not part of the porter yaml
	ImageInfo types.ImageInfo
	// ServerConfig is the server conf, used to find the default helm repo
	ServerConfig *config.Config
	// ProjectID
	ProjectID uint
	// UserUpdate used for synced env groups
	UserUpdate bool
	// EnvGroups used for synced env groups
	EnvGroups []string
	// EnvironmentGroups are used for syncing environment groups using ConfigMaps and Secrets from porter-env-groups namespace. This should be used instead of EnvGroups
	EnvironmentGroups []string
	// Namespace used for synced env groups
	Namespace string
	// ExistingHelmValues is the existing values for the helm release, if it exists
	ExistingHelmValues map[string]interface{}
	// ExistingChartDependencies is the existing dependencies for the helm release, if it exists
	ExistingChartDependencies []*chart.Dependency
	// SubdomainCreateOpts contains the necessary information to create a subdomain if necessary
	SubdomainCreateOpts SubdomainCreateOpts
	// InjectLauncherToStartCommand is a flag to determine whether to prepend the launcher to the start command
	InjectLauncherToStartCommand bool
	// ShouldValidateHelmValues is a flag to determine whether to validate helm values
	ShouldValidateHelmValues bool
	// FullHelmValues if provided, override anything specified in porter.yaml. Used as an escape hatch for support
	FullHelmValues string
}

func parse(ctx context.Context, conf ParseConf) (*chart.Chart, map[string]interface{}, map[string]interface{}, error) {
	parsed := &PorterStackYAML{}

	if conf.FullHelmValues != "" {
		parsedHelmValues, err := convertHelmValuesToPorterYaml(conf.FullHelmValues)
		if err != nil {
			return nil, nil, nil, fmt.Errorf("%s: %w", "error parsing raw helm values", err)
		}
		parsed = parsedHelmValues
	} else {
		err := yaml.Unmarshal(conf.PorterYaml, parsed)
		if err != nil {
			return nil, nil, nil, fmt.Errorf("%s: %w", "error parsing porter.yaml", err)
		}
	}

	synced_env := make([]*SyncedEnvSection, 0)

	for i := range conf.EnvGroups {
		cm, _, err := conf.SubdomainCreateOpts.k8sAgent.GetLatestVersionedConfigMap(conf.EnvGroups[i], conf.Namespace)
		if err != nil {
			return nil, nil, nil, fmt.Errorf("%s: %w", "error building values from porter.yaml", err)
		}

		versionStr, ok := cm.ObjectMeta.Labels["version"]
		if !ok {
			return nil, nil, nil, fmt.Errorf("error extracting version from config map")
		}
		versionInt, err := strconv.Atoi(versionStr)
		if err != nil {
			return nil, nil, nil, fmt.Errorf("error converting version to int: %w", err)
		}

		version := uint(versionInt)

		newSection := &SyncedEnvSection{
			Name:    conf.EnvGroups[i],
			Version: version,
		}

		newSectionKeys := make([]SyncedEnvSectionKey, 0)

		for key, val := range cm.Data {
			newSectionKeys = append(newSectionKeys, SyncedEnvSectionKey{
				Name:   key,
				Secret: strings.Contains(val, "PORTERSECRET"),
			})
		}

		newSection.Keys = newSectionKeys
		synced_env = append(synced_env, newSection)
	}

	if parsed.Apps != nil && parsed.Services != nil {
		return nil, nil, nil, fmt.Errorf("'apps' and 'services' are synonymous but both were defined")
	}

	var services map[string]*Service
	if parsed.Apps != nil {
		services = parsed.Apps
	}

	if parsed.Services != nil {
		services = parsed.Services
	}

	for serviceName := range services {
		fmt.Println("STEFANKS", serviceName)

		fmt.Println("STEFANTYPE", reflect.TypeOf(services[serviceName].Config["labels"]))
		if len(conf.EnvironmentGroups) != 0 {
			// if _, ok := services[serviceName].Config["configMapRefs"]; !ok {
			// 	services[serviceName].Config["configMapRefs"] = []string{}
			// }
			// services[serviceName].Config["configMapRefs"] = conf.EnvironmentGroups

			if _, ok := services[serviceName].Config["labels"]; !ok {
				services[serviceName].Config["labels"] = make(map[string]string)
			}
			if _, ok := services[serviceName].Config["labels"].(map[string]any); ok {
				delete(services[serviceName].Config["labels"].(map[string]any), environment_groups.LabelKey_LinkedEnvironmentGroup)
			}
			switch services[serviceName].Config["labels"].(type) {
			case map[string]any:
				services[serviceName].Config["labels"].(map[string]any)[environment_groups.LabelKey_LinkedEnvironmentGroup] = strings.Join(conf.EnvironmentGroups, ".")
			case map[string]string:
				services[serviceName].Config["labels"].(map[string]string)[environment_groups.LabelKey_LinkedEnvironmentGroup] = strings.Join(conf.EnvironmentGroups, ".")
			case any:
				if services[serviceName].Config["labels"] == nil {
					fmt.Println("STEFANTYPECASE", services[serviceName].Config["labels"])
				}
				if val, ok := services[serviceName].Config["labels"].(string); ok {
					if val == "" {
						services[serviceName].Config["labels"] = map[string]string{
							environment_groups.LabelKey_LinkedEnvironmentGroup: strings.Join(conf.EnvironmentGroups, "."),
						}
					}
				}
				fmt.Println("STEFANTYPECASE", services[serviceName].Config["labels"])
			}
		}
	}

	fmt.Println("STEFANAPPS", parsed.Apps, parsed.Services)

	application := &Application{
		Env:      parsed.Env,
		Services: services,
		Build:    parsed.Build,
		Release:  parsed.Release,
	}

	values, err := buildUmbrellaChartValues(ctx, application, synced_env, conf.ImageInfo, conf.ExistingHelmValues, conf.SubdomainCreateOpts, conf.InjectLauncherToStartCommand, conf.ShouldValidateHelmValues, conf.UserUpdate, conf.Namespace)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("%s: %w", "error building values", err)
	}
	convertedValues := convertMap(values).(map[string]interface{})
	fmt.Println("STEFANV", values)
	fmt.Println("STEFANCV", convertedValues)

	umbrellaChart, err := buildUmbrellaChart(application, conf.ServerConfig, conf.ProjectID, conf.ExistingChartDependencies)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("%s: %w", "error building chart", err)
	}

	// return the parsed release values for the release job chart, if they exist
	var preDeployJobValues map[string]interface{}
	if application.Release != nil && application.Release.Run != nil {
		preDeployJobValues = buildPreDeployJobChartValues(application.Release, application.Env, synced_env, conf.ImageInfo, conf.InjectLauncherToStartCommand, conf.ExistingHelmValues, strings.TrimSuffix(strings.TrimPrefix(conf.Namespace, "porter-stack-"), "")+"-r", conf.UserUpdate)
	}

	return umbrellaChart, convertedValues, preDeployJobValues, nil
}

func buildUmbrellaChartValues(
	ctx context.Context,
	application *Application,
	syncedEnv []*SyncedEnvSection,
	imageInfo types.ImageInfo,
	existingValues map[string]interface{},
	opts SubdomainCreateOpts,
	injectLauncher bool,
	shouldValidateHelmValues bool,
	userUpdate bool,
	namespace string,
) (map[string]interface{}, error) {
	values := make(map[string]interface{})

	if application.Services == nil {
		if existingValues == nil {
			return nil, fmt.Errorf("porter.yaml must contain at least one service, or pre-deploy must exist and have values")
		}
	}

	for name, service := range application.Services {
		serviceType := getType(name, service)

		defaultValues := getDefaultValues(service, application.Env, syncedEnv, serviceType, existingValues, name, userUpdate)
		convertedConfig := convertMap(service.Config).(map[string]interface{})
		helm_values := utils.DeepCoalesceValues(defaultValues, convertedConfig)

		// required to identify the chart type because of https://github.com/helm/helm/issues/9214
		helmName := getHelmName(name, serviceType)
		if existingValues != nil {
			if existingValues[helmName] != nil {
				existingValuesMap := existingValues[helmName].(map[string]interface{})
				helm_values = utils.DeepCoalesceValues(existingValuesMap, helm_values)
			}
		}

		validateErr := validateHelmValues(helm_values, shouldValidateHelmValues, serviceType)
		if validateErr != "" {
			return nil, fmt.Errorf("error validating service \"%s\": %s", name, validateErr)
		}

		err := syncEnvironmentGroupToNamespaceIfLabelsExist(ctx, opts.k8sAgent, service, namespace)
		if err != nil {
			return nil, fmt.Errorf("error syncing environment group to namespace: %w", err)
		}

		err = createSubdomainIfRequired(helm_values, opts) // modifies helm_values to add subdomains if necessary
		if err != nil {
			return nil, err
		}

		// just in case this slips by
		if serviceType == "web" {
			if helm_values["ingress"] == nil {
				helm_values["ingress"] = map[string]interface{}{
					"enabled": false,
				}
			}
		}

		values[helmName] = helm_values
	}

	// add back in the existing services that were not overwritten
	for k, v := range existingValues {
		if values[k] == nil {
			values[k] = v
		}
	}

	// prepend launcher to all start commands if we need to
	for _, v := range values {
		if serviceValues, ok := v.(map[string]interface{}); ok {
			if serviceValues["container"] != nil {
				containerMap := serviceValues["container"].(map[string]interface{})
				if containerMap["command"] != nil {
					command := containerMap["command"].(string)
					if injectLauncher && !strings.HasPrefix(command, "launcher") && !strings.HasPrefix(command, "/cnb/lifecycle/launcher") {
						containerMap["command"] = fmt.Sprintf("/cnb/lifecycle/launcher %s", command)
					}
				}
			}
		}
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

// syncEnvironmentGroupToNamespaceIfLabelsExist will sync the latest version of the environment group to the target namespace if the service has the appropriate label.
func syncEnvironmentGroupToNamespaceIfLabelsExist(ctx context.Context, agent *kubernetes.Agent, service *Service, targetNamespace string) error {
	var linkedGroupNames string

	fmt.Println("STEFTYPES", reflect.TypeOf(service.Config["labels"]))

	// patchwork because we are not consistent with the type of labels
	if labels, ok := service.Config["labels"].(map[string]any); ok {
		if linkedGroup, ok := labels[environment_groups.LabelKey_LinkedEnvironmentGroup].(string); ok {
			linkedGroupNames = linkedGroup
		}
	}
	if labels, ok := service.Config["labels"].(map[string]string); ok {
		if linkedGroup, ok := labels[environment_groups.LabelKey_LinkedEnvironmentGroup]; ok {
			linkedGroupNames = linkedGroup
		}
	}

	for _, linkedGroupName := range strings.Split(linkedGroupNames, ".") {
		inp := environment_groups.SyncLatestVersionToNamespaceInput{
			BaseEnvironmentGroupName: linkedGroupName,
			TargetNamespace:          targetNamespace,
		}

		syncedConfigMap, err := environment_groups.SyncLatestVersionToNamespace(ctx, agent, inp)
		if err != nil {
			return fmt.Errorf("error syncing environment group: %w", err)
		}
		if syncedConfigMap.ConfigMapName != "" {
			if service.Config["configMapRefs"] == nil {
				service.Config["configMapRefs"] = []string{}
			}
			service.Config["configMapRefs"] = append(service.Config["configMapRefs"].([]string), syncedConfigMap.ConfigMapName)
		}
	}

	return nil
}

// we can add to this function up later or use an alternative
func validateHelmValues(values map[string]interface{}, shouldValidateHelmValues bool, appType string) string {
	if shouldValidateHelmValues {
		// validate port for web services
		if appType == "web" {
			containerMap, err := getNestedMap(values, "container")
			if err != nil {
				return "error checking port: misformatted values"
			} else {
				portVal, portExists := containerMap["port"]
				if portExists {
					portStr, pOK := portVal.(string)
					if !pOK {
						return "error checking port: no port in container"
					}

					port, err := strconv.Atoi(portStr)
					if err != nil || port < 1024 || port > 65535 {
						return "port must be a number between 1024 and 65535"
					}
				} else {
					return "port must be specified for web services"
				}
			}
		}
	}
	return ""
}

func buildPreDeployJobChartValues(release *Service, env map[string]string, synced_env []*SyncedEnvSection, imageInfo types.ImageInfo, injectLauncher bool, existingValues map[string]interface{}, name string, userUpdate bool) map[string]interface{} {
	defaultValues := getDefaultValues(release, env, synced_env, "job", existingValues, name+"-r", userUpdate)
	convertedConfig := convertMap(release.Config).(map[string]interface{})
	helm_values := utils.DeepCoalesceValues(defaultValues, convertedConfig)

	if imageInfo.Repository != "" && imageInfo.Tag != "" {
		helm_values["image"] = map[string]interface{}{
			"repository": imageInfo.Repository,
			"tag":        imageInfo.Tag,
		}
	}

	// prepend launcher if we need to
	if helm_values["container"] != nil {
		containerMap := helm_values["container"].(map[string]interface{})
		if containerMap["command"] != nil {
			command := containerMap["command"].(string)
			if injectLauncher && !strings.HasPrefix(command, "launcher") && !strings.HasPrefix(command, "/cnb/lifecycle/launcher") {
				containerMap["command"] = fmt.Sprintf("/cnb/lifecycle/launcher %s", command)
			}
		}
	}

	return helm_values
}

func getType(name string, service *Service) string {
	if service.Type != nil {
		return *service.Type
	}
	if strings.Contains(name, "web") {
		return "web"
	}

	if strings.Contains(name, "job") {
		return "job"
	}

	return "worker"
}

func getDefaultValues(service *Service, env map[string]string, synced_env []*SyncedEnvSection, appType string, existingValues map[string]interface{}, name string, userUpdate bool) map[string]interface{} {
	var defaultValues map[string]interface{}
	var runCommand string
	if service.Run != nil {
		runCommand = *service.Run
	}
	var syncedEnvs []map[string]interface{}
	envConf, err := getStacksNestedMap(existingValues, name+"-"+appType, "container", "env")
	if !userUpdate && err == nil {
		syncedEnvs = envConf
	} else {
		syncedEnvs = deconstructSyncedEnvs(synced_env, env)
	}

	defaultValues = map[string]interface{}{
		"container": map[string]interface{}{
			"command": runCommand,
			"env": map[string]interface{}{
				"normal": CopyEnv(env),
				"synced": syncedEnvs,
			},
		},
	}

	return defaultValues
}

func deconstructSyncedEnvs(synced_env []*SyncedEnvSection, env map[string]string) []map[string]interface{} {
	synced := make([]map[string]interface{}, 0)
	for _, group := range synced_env {
		keys := make([]map[string]interface{}, 0)
		for _, key := range group.Keys {
			if _, exists := env[key.Name]; !exists {
				// Only include keys not present in env
				keys = append(keys, map[string]interface{}{
					"name":   key.Name,
					"secret": key.Secret,
				})
			}
		}

		syncedGroup := map[string]interface{}{
			"keys":    keys,
			"name":    group.Name,
			"version": group.Version,
		}

		synced = append(synced, syncedGroup)
	}

	return synced
}

func buildUmbrellaChart(application *Application, config *config.Config, projectID uint, existingDependencies []*chart.Dependency) (*chart.Chart, error) {
	deps := make([]*chart.Dependency, 0)
	for alias, service := range application.Services {
		var serviceType string
		if existingDependencies != nil {
			for _, dep := range existingDependencies {
				// this condition checks that the dependency is of the form <alias>-web or <alias>-wkr or <alias>-job, meaning it already exists in the chart
				if strings.HasPrefix(dep.Alias, fmt.Sprintf("%s-", alias)) && (strings.HasSuffix(dep.Alias, "-web") || strings.HasSuffix(dep.Alias, "-wkr") || strings.HasSuffix(dep.Alias, "-job")) {
					serviceType = getChartTypeFromHelmName(dep.Alias)
					if serviceType == "" {
						return nil, fmt.Errorf("unable to determine type of existing dependency")
					}
				}
			}
			// this is a new app, so we need to get the type from the app name or type
			if serviceType == "" {
				serviceType = getType(alias, service)
			}
		} else {
			serviceType = getType(alias, service)
		}
		selectedRepo := config.ServerConf.DefaultApplicationHelmRepoURL
		selectedVersion, err := getLatestTemplateVersion(serviceType, config, projectID)
		if err != nil {
			return nil, err
		}
		helmName := getHelmName(alias, serviceType)
		deps = append(deps, &chart.Dependency{
			Name:       serviceType,
			Alias:      helmName,
			Version:    selectedVersion,
			Repository: selectedRepo,
		})
	}

	// add in the existing dependencies that were not overwritten
	for _, dep := range existingDependencies {
		if !dependencyExists(deps, dep) {
			// have to repair the dependency name because of https://github.com/helm/helm/issues/9214
			if strings.HasSuffix(dep.Name, "-web") || strings.HasSuffix(dep.Name, "-wkr") || strings.HasSuffix(dep.Name, "-job") {
				dep.Name = getChartTypeFromHelmName(dep.Name)
			}
			deps = append(deps, dep)
		}
	}

	chart, err := createChartFromDependencies(deps)
	if err != nil {
		return nil, err
	}

	return chart, nil
}

func dependencyExists(deps []*chart.Dependency, dep *chart.Dependency) bool {
	for _, d := range deps {
		if d.Alias == dep.Alias {
			return true
		}
	}
	return false
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

func CopyEnv(env map[string]string) map[string]interface{} {
	envCopy := make(map[string]interface{})
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
		if enabledExists {
			enabled, eOK := enabledVal.(bool)
			if eOK && enabled {
				// if custom domain, we don't need to create a subdomain
				customDomVal, customDomExists := ingressMap["custom_domain"]
				if customDomExists {
					customDomain, cOK := customDomVal.(bool)
					if cOK && customDomain {
						return nil
					}
				}

				// subdomain already exists, no need to create one
				if porterHosts, ok := ingressMap["porter_hosts"].([]interface{}); ok && len(porterHosts) > 0 {
					return nil
				}

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
	if opts.powerDnsClient == nil {
		return nil, fmt.Errorf("cannot create subdomain because powerdns client is nil")
	}

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

func getHelmName(alias string, t string) string {
	var suffix string
	if t == "web" {
		suffix = "-web"
	} else if t == "worker" {
		suffix = "-wkr"
	} else if t == "job" {
		suffix = "-job"
	}
	return fmt.Sprintf("%s%s", alias, suffix)
}

func getChartTypeFromHelmName(name string) string {
	if strings.HasSuffix(name, "-web") {
		return "web"
	} else if strings.HasSuffix(name, "-wkr") {
		return "worker"
	} else if strings.HasSuffix(name, "-job") {
		return "job"
	}
	return ""
}

func getServiceNameAndTypeFromHelmName(name string) (string, string) {
	if strings.HasSuffix(name, "-web") {
		return strings.TrimSuffix(name, "-web"), "web"
	} else if strings.HasSuffix(name, "-wkr") {
		return strings.TrimSuffix(name, "-wkr"), "worker"
	} else if strings.HasSuffix(name, "-job") {
		return strings.TrimSuffix(name, "-job"), "job"
	}
	return "", ""
}

func attemptToGetImageInfoFromRelease(values map[string]interface{}) types.ImageInfo {
	imageInfo := types.ImageInfo{}

	if values == nil {
		return imageInfo
	}

	globalImage, err := getNestedMap(values, "global", "image")
	if err != nil {
		return imageInfo
	}

	repoVal, okRepo := globalImage["repository"]
	tagVal, okTag := globalImage["tag"]
	if okRepo && okTag {
		imageInfo.Repository = repoVal.(string)
		imageInfo.Tag = tagVal.(string)
	}

	return imageInfo
}

func attemptToGetImageInfoFromFullHelmValues(fullHelmValues string) (types.ImageInfo, error) {
	imageInfo := types.ImageInfo{}
	var values map[string]interface{}
	err := yaml.Unmarshal([]byte(fullHelmValues), &values)
	if err != nil {
		return imageInfo, fmt.Errorf("error unmarshaling full helm values to read image info: %w", err)
	}
	convertedValues := convertMap(values).(map[string]interface{})
	return attemptToGetImageInfoFromRelease(convertedValues), nil
}

func getStacksNestedMap(obj map[string]interface{}, fields ...string) ([]map[string]interface{}, error) {
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

	syncedInterface, ok := curr["synced"]
	if !ok {
		return nil, fmt.Errorf("synced not found")
	}

	synced, ok := syncedInterface.([]interface{})
	if !ok {
		return nil, fmt.Errorf("synced is not a slice of interface{}")
	}

	result := make([]map[string]interface{}, len(synced))
	for i, v := range synced {
		mapElement, ok := v.(map[string]interface{})
		if !ok {
			return nil, fmt.Errorf("element %d in synced is not a map[string]interface{}", i)
		}
		result[i] = mapElement
	}
	return result, nil
}

func convertHelmValuesToPorterYaml(helmValues string) (*PorterStackYAML, error) {
	var values map[string]interface{}
	err := yaml.Unmarshal([]byte(helmValues), &values)
	if err != nil {
		return nil, err
	}
	services := make(map[string]*Service)
	// globalLabels, err := extractGlobalLabels(helmValues)
	// if err != nil {
	// 	return nil, fmt.Errorf("unable to extract global labels: %w", err)
	// }

	for k, v := range values {
		if k == "global" {
			continue
		}
		serviceName, serviceType := getServiceNameAndTypeFromHelmName(k)
		if serviceName == "" {
			return nil, fmt.Errorf("invalid service key: %s. make sure that service key ends in either -web, -wkr, or -job", k)
		}

		services[serviceName] = &Service{
			Config: convertMap(v).(map[string]interface{}),
			Type:   &serviceType,
		}

		// if globalLabels != nil {
		// 	if _, ok := services[serviceName].Config["labels"]; !ok {
		// 		services[serviceName].Config["labels"] = make(map[string]string)
		// 	}
		// 	services[serviceName].Config["labels"] = globalLabels
		// }
	}

	return &PorterStackYAML{
		Services: services,
	}, nil
}

func extractGlobalLabels(helmValues string) (map[string]string, error) {
	global := struct {
		Global struct {
			Labels map[string]string `yaml:"labels"`
		} `yaml:"global"`
	}{}

	err := yaml.Unmarshal([]byte(helmValues), &global)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", "error parsing global raw helm values", err)
	}

	if global.Global.Labels == nil {
		return nil, nil
	}

	return global.Global.Labels, nil
}
