package stacks

import (
	"fmt"

	"github.com/porter-dev/porter/internal/encryption"
	"github.com/porter-dev/porter/internal/models"
)

func CloneSourceConfigs(sourceConfigs []models.StackSourceConfig) ([]models.StackSourceConfig, error) {
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

func CloneAppResources(
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

func CloneEnvGroups(envGroups []models.StackEnvGroup) ([]models.StackEnvGroup, error) {
	res := make([]models.StackEnvGroup, 0)

	for _, envGroup := range envGroups {
		uid, err := encryption.GenerateRandomBytes(16)

		if err != nil {
			return nil, err
		}

		res = append(res, models.StackEnvGroup{
			UID:             uid,
			Name:            envGroup.Name,
			EnvGroupVersion: envGroup.EnvGroupVersion,
			Namespace:       envGroup.Namespace,
			ProjectID:       envGroup.ProjectID,
			ClusterID:       envGroup.ClusterID,
		})
	}

	return res, nil
}
