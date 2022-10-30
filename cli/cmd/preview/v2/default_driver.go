package v2

import (
	"context"
	"fmt"
	"os"
	"strings"

	"github.com/mitchellh/mapstructure"
	api "github.com/porter-dev/porter/api/client"
	apiTypes "github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/cli/cmd/config"
	"github.com/porter-dev/porter/cli/cmd/deploy"
	"github.com/porter-dev/switchboard/v2/pkg/types"
)

type DefaultDriver struct {
	Vars      map[string]string
	Env       map[string]string
	Builds    []*types.Build
	APIClient *api.Client
	Namespace string

	allErrors []error
}

func (d *DefaultDriver) PreApply(resource *types.YAMLNode[*types.Resource]) error {
	return nil
}

func (d *DefaultDriver) Apply(resource *types.YAMLNode[*types.Resource]) error {
	if isPorterApp(resource) {
		return d.applyPorterApp(resource)
	}

	// everything else is an addon
	return d.applyAddon(resource)
}

func (d *DefaultDriver) PostApply(resource *types.YAMLNode[*types.Resource]) error {
	return nil
}

func (d *DefaultDriver) OnError(resource *types.YAMLNode[*types.Resource], err error) {

}

func isPorterApp(resource *types.YAMLNode[*types.Resource]) bool {
	if resource.GetValue().ChartURL.GetValue() == "https://charts.getporter.dev" &&
		(resource.GetValue().Type.GetValue() == "web" ||
			resource.GetValue().Type.GetValue() == "worker" ||
			resource.GetValue().Type.GetValue() == "job") {
		return true
	}

	return false
}

func (d *DefaultDriver) applyPorterApp(resource *types.YAMLNode[*types.Resource]) error {
	appBuild := &porterAppBuild{}
	appDeploy := &porterAppDeploy{}
	buildNode := resource.GetValue().Build.GetRawYAMLNode()
	deployNode := resource.GetValue().Deploy.GetRawYAMLNode()

	err := buildNode.Decode(appBuild)

	if err != nil {
		return err // FIXME: descriptive error
	}

	err = deployNode.Decode(appDeploy)

	if err != nil {
		return err // FIXME: descriptive error
	}

	var buildConfig *types.Build

	if appBuild.Ref != "" {
		for _, b := range d.Builds {
			if b.Name.GetValue() == appBuild.Ref {
				buildConfig = b
				break
			}
		}

		if buildConfig == nil {
			// this should not happen
			return fmt.Errorf("internal error: please let the Porter team know about this and quote the following "+
				"error:\n-----\nERROR: invalid build ref given for app '%s'", resource.GetValue().Name.GetValue())
		}
	} else {
		buildConfig = appBuild.Build
	}

	if buildConfig == nil {
		// this should not happen
		return fmt.Errorf("internal error: please let the Porter team know about this and quote the following "+
			"error:\n-----\nERROR: neither build ref nor build body given for app '%s'", resource.GetValue().Name.GetValue())
	}

	if resource.GetValue().Type.GetValue() == "job" {
		jobConfig := &porterJob{}
		jobNode := resource.GetRawYAMLNode()

		err := jobNode.Decode(jobConfig)

		if err != nil {
			return err // FIXME: descriptive error
		}

		return d.applyJob(resource, buildConfig, appDeploy, jobConfig)
	} else if oneOf(resource.GetValue().Type.GetValue(), "web", "worker") {

	} else {
		// this should not happen
		return fmt.Errorf("internal error: please let the Porter team know about this and quote the following "+
			"error:\n-----\nERROR: app '%s' is not one of 'web', 'worker', 'job'", resource.GetValue().Name.GetValue())
	}

	return nil
}

func (d *DefaultDriver) applyAddon(resource *types.YAMLNode[*types.Resource]) error {
	return nil
}

func (d *DefaultDriver) applyJob(
	resource *types.YAMLNode[*types.Resource],
	buildConfig *types.Build,
	appDeploy *porterAppDeploy,
	jobConfig *porterJob,
) error {
	_, err := d.APIClient.GetRelease(
		context.Background(),
		config.GetCLIConfig().Project,
		config.GetCLIConfig().Cluster,
		d.Namespace,
		resource.GetValue().Name.GetValue(),
	)

	exists := err == nil

	flattenedBuildEnv := make(map[string]string)

	for k, v := range buildConfig.Env {
		flattenedBuildEnv[k.GetValue()] = v.GetValue()
	}

	var flattenedBuildEnvGroup []apiTypes.EnvGroupMeta

	for _, egName := range buildConfig.EnvGroups {
		flattenedBuildEnvGroup = append(flattenedBuildEnvGroup, apiTypes.EnvGroupMeta{
			Name:      egName.GetValue(),
			Namespace: d.Namespace,
		})
	}

	sharedOpts := &deploy.SharedOpts{
		ProjectID:       config.GetCLIConfig().Project,
		ClusterID:       config.GetCLIConfig().Cluster,
		Namespace:       d.Namespace,
		LocalPath:       buildConfig.Context.GetValue(),
		LocalDockerfile: buildConfig.Dockerfile.GetValue(),
		// OverrideTag
		Method:        deploy.DeployBuildType(buildConfig.Method.GetValue()),
		AdditionalEnv: flattenedBuildEnv,
		EnvGroups:     flattenedBuildEnvGroup,
		// UseCache
	}

	if exists {
		if jobConfig.Once {
			// since the job already exists and was marked 'once', simply return
			return nil
		}

		updateAgent, err := deploy.NewDeployAgent(d.APIClient, resource.GetValue().Name.GetValue(), &deploy.DeployOpts{
			SharedOpts: sharedOpts,
			Local:      buildConfig.Method.GetValue() != "registry",
		})

		if err != nil {
			return fmt.Errorf("[porter.yaml v2][app:%s] error creating deploy agent to update app: %w",
				resource.GetValue().Name.GetValue(), err)
		}

		// if the build method is registry, we do not trigger a build
		if buildConfig.Method.GetValue() != "registry" {
			buildEnv, err := updateAgent.GetBuildEnv(&deploy.GetBuildEnvOpts{
				UseNewConfig: true,
				// NewConfig:    appConf.Values,
			})

			if err != nil {
				return err // FIXME
			}

			err = updateAgent.SetBuildEnv(buildEnv)

			if err != nil {
				return err // FIXME
			}

			var bc *apiTypes.BuildConfig

			if buildConfig.Method.GetValue() == "pack" {
				// FIXME: temporary fix
				var bp []string

				for _, b := range buildConfig.Buildpacks {
					bp = append(bp, b.GetValue())
				}

				bc = &apiTypes.BuildConfig{
					Builder:    buildConfig.Builder.GetValue(),
					Buildpacks: bp,
				}
			}

			err = updateAgent.Build(bc)

			if err != nil {
				return err // FIXME
			}

			// if !appConf.Build.UseCache { // FIXME
			err = updateAgent.Push()

			if err != nil {
				return err // FIXME
			}
			// }
		}

		// err = updateAgent.UpdateImageAndValues(appConf.Values) // FIXME

		// if err != nil {
		// 	return err // FIXME
		// }
	} else { // create the job
		// attempt to get repo suffix from environment variables
		var repoSuffix string

		if repoName := os.Getenv("PORTER_REPO_NAME"); repoName != "" {
			if repoOwner := os.Getenv("PORTER_REPO_OWNER"); repoOwner != "" {
				repoSuffix = strings.ToLower(strings.ReplaceAll(fmt.Sprintf("%s-%s", repoOwner, repoName), "_", "-"))
			}
		}

		createAgent := &deploy.CreateAgent{
			Client: d.APIClient,
			CreateOpts: &deploy.CreateOpts{
				SharedOpts:  sharedOpts,
				Kind:        resource.GetValue().Type.GetValue(),
				ReleaseName: resource.GetValue().Name.GetValue(),
				// RegistryURL: registryURL, // FIXME: best way to get this ??
				RepoSuffix: repoSuffix,
			},
		}

		if buildConfig.Method.GetValue() == "registry" {
			flattenedDeployMap := make(map[string]any)

			for k, v := range resource.GetValue().Deploy.GetValue() {
				flattenedDeployMap[k.GetValue()] = v.GetValue()
			}

			values := &porterWebChartValues{}

			// delete the aliases from the deploy section
			delete(flattenedDeployMap, "command")
			delete(flattenedDeployMap, "cpu")
			delete(flattenedDeployMap, "memory")

			// replace alias values to the original expect yaml values
			values.Container.Command = appDeploy.Command
			values.Container.Env.Build = flattenedBuildEnv
			values.Container.Env.Normal = appDeploy.Env
			// values.Container.Env.Synced
			values.Resources.Requests.CPU = appDeploy.CPU
			values.Resources.Requests.Memory = appDeploy.Memory
			if len(appDeploy.Hosts) > 0 {
				values.Ingress.CustomDomain = true
				values.Ingress.Hosts = appDeploy.Hosts
			}

			overrideValues := make(map[string]any)

			err = mapstructure.Decode(values, &overrideValues)

			if err != nil {
				return err // FIXME
			}

			_, err := createAgent.CreateFromRegistry("", nil)

			if err != nil {
				return fmt.Errorf("[porter.yaml v2][app:%s] error creating job: %w", resource.GetValue().Name.GetValue(), err)
			}
		} else if oneOf(buildConfig.Method.GetValue(), "pack", "docker") {
			_, err := createAgent.CreateFromDocker(nil, "", nil)

			if err != nil {
				return fmt.Errorf("[porter.yaml v2][app:%s] error creating job: %w", resource.GetValue().Name.GetValue(), err)
			}
		} else {
			// this should not happen
			return fmt.Errorf("internal error: please let the Porter team know about this and quote the following "+
				"error:\n-----\nERROR: build method was not one of 'pack', 'docker', 'registry' for app '%s'",
				resource.GetValue().Name.GetValue())
		}
	}

	return nil
}
