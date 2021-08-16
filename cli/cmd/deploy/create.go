package deploy

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/porter-dev/porter/cli/cmd/api"
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
	gitRepos, err := c.Client.ListGitRepos(
		context.Background(),
		c.CreateOpts.ProjectID,
	)

	if err != nil {
		return "", err
	}

	var gitRepoMatch uint

	for _, gitRepo := range gitRepos {
		// for each git repo, search for a matching username/owner
		githubRepos, err := c.Client.ListGithubRepos(
			context.Background(),
			c.CreateOpts.ProjectID,
			gitRepo,
		)

		if err != nil {
			return "", err
		}

		for _, githubRepo := range githubRepos {
			if githubRepo.FullName == ghOpts.Repo {
				gitRepoMatch = gitRepo
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

	latestVersion, mergedValues, err := c.getMergedValues(overrideValues)

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

	env, err := GetEnvFromConfig(mergedValues)

	if err != nil {
		env = map[string]string{}
	}

	subdomain, err := c.CreateSubdomainIfRequired(mergedValues)

	if err != nil {
		return "", err
	}

	err = c.Client.DeployTemplate(
		context.Background(),
		opts.ProjectID,
		opts.ClusterID,
		opts.Kind,
		latestVersion,
		&api.DeployTemplateRequest{
			TemplateName: opts.Kind,
			ImageURL:     imageURL,
			FormValues:   mergedValues,
			Namespace:    opts.Namespace,
			Name:         opts.ReleaseName,
			GitAction: &api.DeployTemplateGitAction{
				GitRepo:        ghOpts.Repo,
				GitBranch:      ghOpts.Branch,
				ImageRepoURI:   imageURL,
				DockerfilePath: opts.LocalDockerfile,
				FolderPath:     ".",
				GitRepoID:      gitRepoMatch,
				BuildEnv:       env,
				RegistryID:     regID,
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

	latestVersion, mergedValues, err := c.getMergedValues(overrideValues)

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
		opts.Kind,
		latestVersion,
		&api.DeployTemplateRequest{
			TemplateName: opts.Kind,
			ImageURL:     imageSpl[0],
			FormValues:   mergedValues,
			Namespace:    opts.Namespace,
			Name:         opts.ReleaseName,
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

	latestVersion, mergedValues, err := c.getMergedValues(overrideValues)

	if err != nil {
		return "", err
	}

	mergedValues["image"] = map[string]interface{}{
		"repository": imageURL,
		"tag":        "latest",
	}

	// create docker agen
	agent, err := docker.NewAgentWithAuthGetter(c.Client, opts.ProjectID)

	if err != nil {
		return "", err
	}

	env, err := GetEnvFromConfig(mergedValues)

	if err != nil {
		env = map[string]string{}
	}

	buildAgent := &BuildAgent{
		SharedOpts:  opts.SharedOpts,
		client:      c.Client,
		imageRepo:   imageURL,
		env:         env,
		imageExists: false,
	}

	if opts.Method == DeployBuildTypeDocker {
		err = buildAgent.BuildDocker(agent, opts.LocalPath, ".", opts.LocalDockerfile, "latest")
	} else {
		err = buildAgent.BuildPack(agent, opts.LocalPath, "latest")
	}

	if err != nil {
		return "", err
	}

	// create repository
	err = c.Client.CreateRepository(
		context.Background(),
		opts.ProjectID,
		regID,
		&api.CreateRepositoryRequest{
			ImageRepoURI: imageURL,
		},
	)

	if err != nil {
		return "", err
	}

	err = agent.PushImage(fmt.Sprintf("%s:%s", imageURL, "latest"))

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
		opts.Kind,
		latestVersion,
		&api.DeployTemplateRequest{
			TemplateName: opts.Kind,
			ImageURL:     imageURL,
			FormValues:   mergedValues,
			Namespace:    opts.Namespace,
			Name:         opts.ReleaseName,
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
	registries, err := c.Client.ListRegistries(
		context.Background(),
		c.CreateOpts.ProjectID,
	)

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
				imageURI = fmt.Sprintf("%s/%s-%s", reg.URL, name, namespace)
				break
			}
		} else if reg.URL != "" {
			regID = reg.ID
			imageURI = fmt.Sprintf("%s/%s-%s", reg.URL, name, namespace)
			break
		}
	}

	return regID, imageURI, nil
}

// GetLatestTemplateVersion retrieves the latest template version for a specific
// Porter template from the chart repository.
func (c *CreateAgent) GetLatestTemplateVersion(templateName string) (string, error) {
	templates, err := c.Client.ListTemplates(
		context.Background(),
	)

	if err != nil {
		return "", err
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

// GetLatestTemplateDefaultValues gets the default config (`values.yaml`) set for a specific
// template.
func (c *CreateAgent) GetLatestTemplateDefaultValues(templateName, templateVersion string) (map[string]interface{}, error) {
	chart, err := c.Client.GetTemplate(
		context.Background(),
		templateName,
		templateVersion,
	)

	if err != nil {
		return nil, err
	}

	return chart.Values, nil
}

func (c *CreateAgent) getMergedValues(overrideValues map[string]interface{}) (string, map[string]interface{}, error) {
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

	// merge existing values with overriding values
	mergedValues := utils.CoalesceValues(values, overrideValues)

	return latestVersion, mergedValues, err
}

func (c *CreateAgent) CreateSubdomainIfRequired(mergedValues map[string]interface{}) (string, error) {
	subdomain := ""

	// check for automatic subdomain creation if web kind
	if c.CreateOpts.Kind == "web" {
		// look for ingress.enabled and no custom domains set
		ingressMap, err := getNestedMap(mergedValues, "ingress")

		if err == nil {
			enabledVal, enabledExists := ingressMap["enabled"]

			customDomVal, customDomExists := ingressMap["custom_domain"]

			if enabledExists && customDomExists {
				enabled, eOK := enabledVal.(bool)
				customDomain, cOK := customDomVal.(bool)

				// in the case of ingress enabled but no custom domain, create subdomain
				if eOK && cOK && enabled && !customDomain {
					dnsRecord, err := c.Client.CreateDNSRecord(
						context.Background(),
						c.CreateOpts.ProjectID,
						c.CreateOpts.ClusterID,
						&api.CreateDNSRecordRequest{
							ReleaseName: c.CreateOpts.ReleaseName,
						},
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

	return subdomain, nil
}
