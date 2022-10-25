package stack

import (
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/helm"
	"github.com/porter-dev/porter/internal/helm/loader"
	"github.com/porter-dev/porter/internal/models"
	"helm.sh/helm/v3/pkg/release"
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

	chart, err := loader.LoadChartPublic(opts.request.TemplateRepoURL, opts.request.TemplateName, opts.request.TemplateVersion)

	if err != nil {
		return nil, err
	}

	conf := &helm.InstallChartConfig{
		Chart:      chart,
		Name:       opts.request.Name,
		Namespace:  opts.namespace,
		Values:     opts.request.Values,
		Cluster:    opts.cluster,
		Repo:       opts.config.Repo,
		Registries: opts.registries,
	}

	if conf.Values == nil {
		conf.Values = make(map[string]interface{})
	}

	conf.Values["stack"] = map[string]interface{}{
		"enabled":  true,
		"name":     opts.stackName,
		"revision": opts.stackRevision,
	}

	return opts.helmAgent.InstallChart(conf, opts.config.DOConf, opts.config.ServerConf.DisablePullSecretsInjection)
}

type rollbackAppResourceOpts struct {
	helmAgent      *helm.Agent
	helmRevisionID uint
	name           string
}

func rollbackAppResource(opts *rollbackAppResourceOpts) error {
	return opts.helmAgent.RollbackRelease(opts.name, int(opts.helmRevisionID))
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
	rel, err := opts.helmAgent.GetRelease(opts.name, 0, true)

	if err != nil {
		return err
	}

	imagePre := rel.Config["image"]
	image := imagePre.(map[string]interface{})
	image["tag"] = opts.tag
	rel.Config["image"] = image

	conf := &helm.UpgradeReleaseConfig{
		Name:       opts.name,
		Cluster:    opts.cluster,
		Repo:       opts.config.Repo,
		Registries: opts.registries,
		Values:     rel.Config,

		// stack related info
		StackName:     opts.stackName,
		StackRevision: opts.stackRevision,
	}

	_, err = opts.helmAgent.UpgradeReleaseByValues(conf, opts.config.DOConf,
		opts.config.ServerConf.DisablePullSecretsInjection)

	return err
}

type deleteAppResourceOpts struct {
	helmAgent *helm.Agent
	name      string
}

func deleteAppResource(opts *deleteAppResourceOpts) error {
	_, err := opts.helmAgent.UninstallChart(opts.name)

	return err
}

// func setValuesWithSourceConfig(values map[string]interface{}, sourceConfig )
