package stack

import (
	"fmt"

	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/encryption"
	"github.com/porter-dev/porter/internal/helm"
	"github.com/porter-dev/porter/internal/helm/loader"
	"github.com/porter-dev/porter/internal/models"
)

type applyAppResourceOpts struct {
	config     *config.Config
	projectID  uint
	namespace  string
	cluster    *models.Cluster
	helmAgent  *helm.Agent
	request    *types.CreateStackAppResourceRequest
	registries []*models.Registry
}

func applyAppResource(opts *applyAppResourceOpts) error {
	if opts.request.TemplateVersion == "latest" {
		opts.request.TemplateVersion = ""
	}

	chart, err := loader.LoadChartPublic(opts.request.TemplateRepoURL, opts.request.TemplateName, opts.request.TemplateVersion)

	if err != nil {
		return err
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

	_, err = opts.helmAgent.InstallChart(conf, opts.config.DOConf)

	if err != nil {
		return err
	}

	return nil
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
	}

	_, err = opts.helmAgent.UpgradeReleaseByValues(conf, opts.config.DOConf)

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

func cloneSourceConfigs(sourceConfigs []models.StackSourceConfig) ([]models.StackSourceConfig, error) {
	res := make([]models.StackSourceConfig, 0)

	// for now, only write source configs which are deployed as a docker image
	// TODO: add parsing/writes for git-based sources
	for _, sourceConfig := range sourceConfigs {
		uid, err := encryption.GenerateRandomBytes(16)

		if err != nil {
			return nil, err
		}

		res = append(res, models.StackSourceConfig{
			UID:          uid,
			Name:         sourceConfig.Name,
			ImageRepoURI: sourceConfig.ImageRepoURI,
			ImageTag:     sourceConfig.ImageTag,
		})
	}

	return res, nil
}

func cloneAppResources(
	appResources []models.StackResource,
	prevSourceConfigs []models.StackSourceConfig,
	newSourceConfigs []models.StackSourceConfig,
) ([]models.StackResource, error) {
	res := make([]models.StackResource, 0)

	// for now, only write source configs which are deployed as a docker image
	// TODO: add parsing/writes for git-based sources
	for _, appResource := range appResources {
		uid, err := encryption.GenerateRandomBytes(16)

		if err != nil {
			return nil, err
		}

		var linkedSourceConfigUID string

		for _, prevSourceConfig := range prevSourceConfigs {
			if prevSourceConfig.UID == appResource.StackSourceConfigUID {
				// find the corresponding new source config
				for _, newSourceConfig := range newSourceConfigs {
					if newSourceConfig.Name == prevSourceConfig.Name {
						linkedSourceConfigUID = newSourceConfig.UID
					}
				}
			}
		}

		if linkedSourceConfigUID == "" {
			return nil, fmt.Errorf("source config does not exist in source config list")
		}

		res = append(res, models.StackResource{
			Name:                 appResource.Name,
			UID:                  uid,
			StackSourceConfigUID: linkedSourceConfigUID,
			TemplateRepoURL:      appResource.TemplateRepoURL,
			TemplateName:         appResource.TemplateName,
			TemplateVersion:      appResource.TemplateVersion,
			HelmRevisionID:       appResource.HelmRevisionID,
		})
	}

	return res, nil
}

// func setValuesWithSourceConfig(values map[string]interface{}, sourceConfig )
