package v2

import (
	"context"
	"fmt"

	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/cli/cmd/config"
	"github.com/porter-dev/switchboard/v2/pkg/types"
)

type DefaultDriver struct {
	Vars      map[string]string
	Env       map[string]string
	Builds    []*types.Build
	APIClient *api.Client
	Namespace string
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

	if resource.GetValue().Type.GetValue() == "job" {
		jobConfig := &porterJob{}
		jobNode := resource.GetRawYAMLNode()

		err := jobNode.Decode(jobConfig)

		if err != nil {
			return err // FIXME: descriptive error
		}

		return d.applyJob(resource, appBuild, appDeploy, jobConfig, d.Builds)
	}

	return nil
}

func (d *DefaultDriver) applyAddon(resource *types.YAMLNode[*types.Resource]) error {
	return nil
}

func (d *DefaultDriver) applyJob(
	resource *types.YAMLNode[*types.Resource],
	appBuild *porterAppBuild,
	appDeploy *porterAppDeploy,
	jobConfig *porterJob,
	builds []*types.Build,
) error {
	if jobConfig.Once {
		// let us check if the job has already been created
		_, err := d.APIClient.GetRelease(
			context.Background(),
			config.GetCLIConfig().Project,
			config.GetCLIConfig().Cluster,
			d.Namespace,
			resource.GetValue().Name.GetValue(),
		)

		if err == nil {
			// job already exists
			return nil
		}
	}

	var buildConfig *types.Build

	if appBuild.Ref != "" {
		for _, b := range builds {
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

	return nil
}
