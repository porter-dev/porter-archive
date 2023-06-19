package stack

import (
	"context"

	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/helm"
	"github.com/porter-dev/porter/internal/helm/loader"
	"github.com/porter-dev/porter/internal/models"
	"github.com/stefanmcshane/helm/pkg/release"
)

type applyAppResourceOpts struct {
	config     *config.Config
	projectID  uint
	namespace  string
	cluster    *models.Cluster
	helmAgent  *helm.Agent
	request    *types.CreateStackAppResourceRequest
	registries []*models.Registry

	// stack related info
	stackName     string
	stackRevision uint
}

func applyAppResource(opts *applyAppResourceOpts) (*release.Release, error) {
	if opts.request.TemplateVersion == "latest" {
		opts.request.TemplateVersion = ""
	}

	chart, err := loader.LoadChartPublic(context.Background(), opts.request.TemplateRepoURL, opts.request.TemplateName, opts.request.TemplateVersion)
	if err != nil {
		return nil, err
	}

	conf := &helm.InstallChartConfig{
		Chart:                     chart,
		Name:                      opts.request.Name,
		Namespace:                 opts.namespace,
		Values:                    opts.request.Values,
		Cluster:                   opts.cluster,
		Repo:                      opts.config.Repo,
		Registries:                opts.registries,
		ClusterControlPlaneClient: opts.config.ClusterControlPlaneClient,
	}

	if conf.Values == nil {
		conf.Values = make(map[string]interface{})
	}

	conf.Values["stack"] = map[string]interface{}{
		"enabled":  true,
		"name":     opts.stackName,
		"revision": opts.stackRevision,
	}

	return opts.helmAgent.InstallChart(context.Background(), conf, opts.config.DOConf, opts.config.ServerConf.DisablePullSecretsInjection)
}

type rollbackAppResourceOpts struct {
	helmAgent      *helm.Agent
	helmRevisionID uint
	name           string
}

func rollbackAppResource(opts *rollbackAppResourceOpts) error {
	return opts.helmAgent.RollbackRelease(context.Background(), opts.name, int(opts.helmRevisionID))
}

type updateAppResourceTagOpts struct {
	helmAgent  *helm.Agent
	name, tag  string
	config     *config.Config
	projectID  uint
	namespace  string
	cluster    *models.Cluster
	registries []*models.Registry

	// stack related info
	stackName     string
	stackRevision uint
}

func updateAppResourceTag(opts *updateAppResourceTagOpts) error {
	// read the current release to get the current values
	rel, err := opts.helmAgent.GetRelease(context.Background(), opts.name, 0, true)
	if err != nil {
		return err
	}

	imagePre := rel.Config["image"]
	image := imagePre.(map[string]interface{})
	image["tag"] = opts.tag
	rel.Config["image"] = image

	conf := &helm.UpgradeReleaseConfig{
		Name:                      opts.name,
		Cluster:                   opts.cluster,
		Repo:                      opts.config.Repo,
		Registries:                opts.registries,
		Values:                    rel.Config,
		ClusterControlPlaneClient: opts.config.ClusterControlPlaneClient,

		// stack related info
		StackName:     opts.stackName,
		StackRevision: opts.stackRevision,
	}

	_, err = opts.helmAgent.UpgradeReleaseByValues(context.Background(), conf, opts.config.DOConf,
		opts.config.ServerConf.DisablePullSecretsInjection, false)

	return err
}

type deleteAppResourceOpts struct {
	helmAgent *helm.Agent
	name      string
}

func deleteAppResource(opts *deleteAppResourceOpts) error {
	_, err := opts.helmAgent.UninstallChart(context.Background(), opts.name)

	return err
}

// func setValuesWithSourceConfig(values map[string]interface{}, sourceConfig )
