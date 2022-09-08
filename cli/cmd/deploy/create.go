package deploy

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/cli/cmd/docker"
	"github.com/porter-dev/porter/internal/templater/utils"
)

// CreateAgent handles the creation of a new application on Porter
type CreateAgent struct {
	Client     *api.Client
	CreateOpts *CreateOpts
}

// CreateOpts are required options for creating a new application on Porter: the
// "kind" (web, worker, job) and the name of the application.
type CreateOpts struct {
	*SharedOpts

	Kind        string
	ReleaseName string
	RegistryURL string

	// Suffix for the name of the image in the repository. By default the suffix is the
	// target namespace.
	RepoSuffix string
}

// GithubOpts are the options for linking a Github source to the app
type GithubOpts struct {
	Branch string
	Repo   string
}

// CreateFromGithub uses the branch/repo to link the Github source for an application.
// This function attempts to find a matching repository in the list of linked repositories
// on Porter. If one is found, it will use that repository as the app source.
func (c *CreateAgent) CreateFromGithub(
	ghOpts *GithubOpts,
	overrideValues map[string]interface{},
) (string, error) {
	opts := c.CreateOpts

	// get all linked github repos and find matching repo
	resp, err := c.Client.ListGitInstallationIDs(
		context.Background(),
		c.CreateOpts.ProjectID,
	)

	if err != nil {
		return "", err
	}

	gitInstallations := *resp

	var gitRepoMatch int64

	for _, gitInstallationID := range gitInstallations {
		// for each git repo, search for a matching username/owner
		resp, err := c.Client.ListGitRepos(
			context.Background(),
			c.CreateOpts.ProjectID,
			gitInstallationID,
		)

		if err != nil {
			return "", err
		}

		githubRepos := *resp

		for _, githubRepo := range githubRepos {
			if githubRepo.FullName == ghOpts.Repo {
				gitRepoMatch = gitInstallationID
				break
			}
		}

		if gitRepoMatch != 0 {
			break
		}
	}

	if gitRepoMatch == 0 {
		return "", fmt.Errorf("could not find a linked github repo for %s. Make sure you have linked your Github account on the Porter dashboard.", ghOpts.Repo)
	}

	latestVersion, mergedValues, err := c.GetMergedValues(overrideValues)

	if err != nil {
		return "", err
	}

	if opts.Kind == "web" || opts.Kind == "worker" {
		mergedValues["image"] = map[string]interface{}{
			"repository": "public.ecr.aws/o1j4x7p4/hello-porter",
			"tag":        "latest",
		}
	} else if opts.Kind == "job" {
		mergedValues["image"] = map[string]interface{}{
			"repository": "public.ecr.aws/o1j4x7p4/hello-porter-job",
			"tag":        "latest",
		}
	}

	regID, imageURL, err := c.GetImageRepoURL(opts.ReleaseName, opts.Namespace)

	if err != nil {
		return "", err
	}

	subdomain, err := c.CreateSubdomainIfRequired(mergedValues)

	if err != nil {
		return "", err
	}

	err = c.Client.DeployTemplate(
		context.Background(),
		opts.ProjectID,
		opts.ClusterID,
		opts.Namespace,
		&types.CreateReleaseRequest{
			CreateReleaseBaseRequest: &types.CreateReleaseBaseRequest{
				TemplateName:    opts.Kind,
				TemplateVersion: latestVersion,
				Values:          mergedValues,
				Name:            opts.ReleaseName,
			},
			ImageURL: imageURL,
			GitActionConfig: &types.CreateGitActionConfigRequest{
				GitRepo:              ghOpts.Repo,
				GitBranch:            ghOpts.Branch,
				ImageRepoURI:         imageURL,
				DockerfilePath:       opts.LocalDockerfile,
				FolderPath:           ".",
				GitRepoID:            uint(gitRepoMatch),
				RegistryID:           regID,
				ShouldCreateWorkflow: true,
			},
		},
	)

	if err != nil {
		return "", err
	}

	return subdomain, nil
}

// CreateFromRegistry deploys a new application from an existing Docker repository + tag.
func (c *CreateAgent) CreateFromRegistry(
	image string,
	overrideValues map[string]interface{},
) (string, error) {
	if image == "" {
		return "", fmt.Errorf("image cannot be empty")
	}

	// split image into image-path:tag format
	imageSpl := strings.Split(image, ":")

	if len(imageSpl) != 2 {
		return "", fmt.Errorf("invalid image format: must be image-path:tag format")
	}

	opts := c.CreateOpts

	latestVersion, mergedValues, err := c.GetMergedValues(overrideValues)

	if err != nil {
		return "", err
	}

	mergedValues["image"] = map[string]interface{}{
		"repository": imageSpl[0],
		"tag":        imageSpl[1],
	}

	subdomain, err := c.CreateSubdomainIfRequired(mergedValues)

	if err != nil {
		return "", err
	}

	err = c.Client.DeployTemplate(
		context.Background(),
		opts.ProjectID,
		opts.ClusterID,
		opts.Namespace,
		&types.CreateReleaseRequest{
			CreateReleaseBaseRequest: &types.CreateReleaseBaseRequest{
				TemplateName:    opts.Kind,
				TemplateVersion: latestVersion,
				Values:          mergedValues,
				Name:            opts.ReleaseName,
			},
			ImageURL: imageSpl[0],
		},
	)

	if err != nil {
		return "", err
	}

	return subdomain, nil
}

// CreateFromDocker uses a local build context and a local Docker daemon to build a new
// container image, and then deploys it onto Porter.
func (c *CreateAgent) CreateFromDocker(
	overrideValues map[string]interface{},
	imageTag string,
	extraBuildConfig *types.BuildConfig,
) (string, error) {
	opts := c.CreateOpts

	// detect the build config
	if opts.Method != "" {
		if opts.Method == DeployBuildTypeDocker {
			if opts.LocalDockerfile == "" {
				hasDockerfile := c.HasDefaultDockerfile(opts.LocalPath)

				if !hasDockerfile {
					return "", fmt.Errorf("Dockerfile not found")
				}

				opts.LocalDockerfile = "Dockerfile"
			}
		}
	} else {
		// try to detect dockerfile, otherwise fall back to `pack`
		hasDockerfile := c.HasDefaultDockerfile(opts.LocalPath)

		if !hasDockerfile {
			opts.Method = DeployBuildTypePack
		} else {
			opts.Method = DeployBuildTypeDocker
			opts.LocalDockerfile = "Dockerfile"
		}
	}

	// overwrite with docker image repository and tag
	regID, imageURL, err := c.GetImageRepoURL(opts.ReleaseName, opts.Namespace)

	if err != nil {
		return "", err
	}

	latestVersion, mergedValues, err := c.GetMergedValues(overrideValues)

	if err != nil {
		return "", err
	}

	mergedValues["image"] = map[string]interface{}{
		"repository": imageURL,
		"tag":        imageTag,
	}

	// create docker agent
	agent, err := docker.NewAgentWithAuthGetter(c.Client, opts.ProjectID)

	if err != nil {
		return "", err
	}

	env, err := GetEnvForRelease(c.Client, mergedValues, opts.ProjectID, opts.ClusterID, opts.Namespace)

	if err != nil {
		env = make(map[string]string)
	}

	envConfig, err := GetNestedMap(mergedValues, "container", "env")

	if err == nil {
		_, exists := envConfig["build"]

		if exists {
			buildEnv, err := GetNestedMap(mergedValues, "container", "env", "build")

			if err == nil {
				for key, val := range buildEnv {
					if valStr, ok := val.(string); ok {
						env[key] = valStr
					}
				}
			}
		}
	}

	// add additional env based on options
	for key, val := range opts.SharedOpts.AdditionalEnv {
		env[key] = val
	}

	buildAgent := &BuildAgent{
		SharedOpts:  opts.SharedOpts,
		APIClient:   c.Client,
		ImageRepo:   imageURL,
		Env:         env,
		ImageExists: false,
	}

	if opts.Method == DeployBuildTypeDocker {
		var basePath string

		basePath, err = filepath.Abs(".")

		if err != nil {
			return "", err
		}

		err = buildAgent.BuildDocker(agent, basePath, opts.LocalPath, opts.LocalDockerfile, imageTag, "")
	} else {
		err = buildAgent.BuildPack(agent, opts.LocalPath, imageTag, "", extraBuildConfig)
	}

	if err != nil {
		return "", err
	}

	if !opts.SharedOpts.UseCache {
		// create repository
		err = c.Client.CreateRepository(
			context.Background(),
			opts.ProjectID,
			regID,
			&types.CreateRegistryRepositoryRequest{
				ImageRepoURI: imageURL,
			},
		)

		if err != nil {
			return "", err
		}

		err = agent.PushImage(fmt.Sprintf("%s:%s", imageURL, imageTag))

		if err != nil {
			return "", err
		}
	}

	subdomain, err := c.CreateSubdomainIfRequired(mergedValues)

	if err != nil {
		return "", err
	}

	err = c.Client.DeployTemplate(
		context.Background(),
		opts.ProjectID,
		opts.ClusterID,
		opts.Namespace,
		&types.CreateReleaseRequest{
			CreateReleaseBaseRequest: &types.CreateReleaseBaseRequest{
				TemplateName:    opts.Kind,
				TemplateVersion: latestVersion,
				Values:          mergedValues,
				Name:            opts.ReleaseName,
			},
			ImageURL: imageURL,
		},
	)

	if err != nil {
		return "", err
	}

	return subdomain, nil
}

// HasDefaultDockerfile detects if there is a dockerfile at the path `./Dockerfile`
func (c *CreateAgent) HasDefaultDockerfile(buildPath string) bool {
	dockerFilePath := filepath.Join(buildPath, "./Dockerfile")

	info, err := os.Stat(dockerFilePath)

	return err == nil && !os.IsNotExist(err) && !info.IsDir()
}

// GetImageRepoURL creates the image repository url by finding the first valid image
// registry linked to Porter, and then generates a new name of the form:
// `{registry}/{name}-{namespace}`
func (c *CreateAgent) GetImageRepoURL(name, namespace string) (uint, string, error) {
	// get all image registries linked to the project
	// get the list of namespaces
	resp, err := c.Client.ListRegistries(
		context.Background(),
		c.CreateOpts.ProjectID,
	)

	registries := *resp

	if err != nil {
		return 0, "", err
	} else if len(registries) == 0 {
		return 0, "", fmt.Errorf("must have created or linked an image registry")
	}

	// get the first non-empty registry
	var imageURI string
	var regID uint

	for _, reg := range registries {
		if c.CreateOpts.RegistryURL != "" {
			if c.CreateOpts.RegistryURL == reg.URL {
				regID = reg.ID
				if c.CreateOpts.RepoSuffix != "" {
					imageURI = fmt.Sprintf("%s/%s-%s", reg.URL, name, c.CreateOpts.RepoSuffix)
				} else {
					imageURI = fmt.Sprintf("%s/%s-%s", reg.URL, name, namespace)
				}

				break
			}
		} else if reg.URL != "" {
			regID = reg.ID

			if c.CreateOpts.RepoSuffix != "" {
				imageURI = fmt.Sprintf("%s/%s-%s", reg.URL, name, c.CreateOpts.RepoSuffix)
			} else {
				imageURI = fmt.Sprintf("%s/%s-%s", reg.URL, name, namespace)
			}

			break
		}
	}

	if strings.Contains(imageURI, "pkg.dev") {
		repoSlice := strings.Split(imageURI, "/")
		imageURI = fmt.Sprintf("%s/%s", imageURI, repoSlice[len(repoSlice)-1])
	} else if strings.Contains(imageURI, "index.docker.io") {
		repoSlice := strings.Split(imageURI, "/")
		imageURI = strings.Join(repoSlice[:len(repoSlice)-1], "/")
	}

	return regID, imageURI, nil
}

// GetLatestTemplateVersion retrieves the latest template version for a specific
// Porter template from the chart repository.
func (c *CreateAgent) GetLatestTemplateVersion(templateName string) (string, error) {
	resp, err := c.Client.ListTemplates(
		context.Background(),
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

// GetLatestTemplateDefaultValues gets the default config (`values.yaml`) set for a specific
// template.
func (c *CreateAgent) GetLatestTemplateDefaultValues(templateName, templateVersion string) (map[string]interface{}, error) {
	chart, err := c.Client.GetTemplate(
		context.Background(),
		templateName,
		templateVersion,
		&types.GetTemplateRequest{},
	)

	if err != nil {
		return nil, err
	}

	return chart.Values, nil
}

func (c *CreateAgent) GetMergedValues(overrideValues map[string]interface{}) (string, map[string]interface{}, error) {
	// deploy the template
	latestVersion, err := c.GetLatestTemplateVersion(c.CreateOpts.Kind)

	if err != nil {
		return "", nil, err
	}

	// get the values of the template
	values, err := c.GetLatestTemplateDefaultValues(c.CreateOpts.Kind, latestVersion)

	if err != nil {
		return "", nil, err
	}

	err = coalesceEnvGroups(c.Client, c.CreateOpts.ProjectID, c.CreateOpts.ClusterID,
		c.CreateOpts.Namespace, c.CreateOpts.EnvGroups, values)

	if err != nil {
		return "", nil, err
	}

	// merge existing values with overriding values
	mergedValues := utils.CoalesceValues(values, overrideValues)

	return latestVersion, mergedValues, err
}

func (c *CreateAgent) CreateSubdomainIfRequired(mergedValues map[string]interface{}) (string, error) {
	subdomain := ""

	// check for automatic subdomain creation if web kind
	if c.CreateOpts.Kind == "web" {
		// look for ingress.enabled and no custom domains set
		ingressMap, err := GetNestedMap(mergedValues, "ingress")

		if err == nil {
			enabledVal, enabledExists := ingressMap["enabled"]

			customDomVal, customDomExists := ingressMap["custom_domain"]

			if enabledExists && customDomExists {
				enabled, eOK := enabledVal.(bool)
				customDomain, cOK := customDomVal.(bool)

				if eOK && cOK && enabled {
					if customDomain {
						// return the first custom domain when one exists
						hostsArr, hostsExists := ingressMap["hosts"]

						if hostsExists {
							hostsArrVal, hostsArrOk := hostsArr.([]interface{})

							if hostsArrOk && len(hostsArrVal) > 0 {
								subdomainStr, ok := hostsArrVal[0].(string)

								if ok {
									subdomain = subdomainStr
								}
							}
						}
					} else {
						// in the case of ingress enabled but no custom domain, create subdomain
						dnsRecord, err := c.Client.CreateDNSRecord(
							context.Background(),
							c.CreateOpts.ProjectID,
							c.CreateOpts.ClusterID,
							c.CreateOpts.Namespace,
							c.CreateOpts.ReleaseName,
						)

						if err != nil {
							return "", fmt.Errorf("Error creating subdomain: %s", err.Error())
						}

						subdomain = dnsRecord.ExternalURL

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
		}
	}

	return subdomain, nil
}
