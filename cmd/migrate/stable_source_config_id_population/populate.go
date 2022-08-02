package stable_source_config_id_population

import (
	"github.com/porter-dev/porter/internal/models"
	_gorm "gorm.io/gorm"
)

func PopulateStableSourceConfigId(db *_gorm.DB) {
	var dest []*models.StackRevision
	db.Model(&models.StackRevision{}).Preload("SourceConfigs").Find(&dest)

	// Create a map that will separate source configs based on stack and name
	// this will allow us to check all the source configs revisions that correspond
	// to the same source config object.
	sourceConfigsPerStack := make(map[uint]map[string][]models.StackSourceConfig)
	for _, revision := range dest {
		if sourceConfigsPerStack[revision.StackID] == nil {
			sourceConfigsPerStack[revision.StackID] = make(map[string][]models.StackSourceConfig)
		}

		for _, sc := range revision.SourceConfigs {
			sourceConfigsPerStack[revision.StackID][sc.Name] = append(sourceConfigsPerStack[revision.StackID][sc.Name], sc)
		}
	}

	// Populate the stable source config id for each revision of the source config
	for _, sourceConfigsWithSameNameMap := range sourceConfigsPerStack {
		for _, sc := range sourceConfigsWithSameNameMap {
			sortedSourceConfigs := sortSourceConfigsByCreationDate(sc)

			stableSourceConfigId := findSourceConfigWithStableSourceConfigID(sortedSourceConfigs)

			if stableSourceConfigId == "" {
				stableSourceConfigId = sortedSourceConfigs[0].UID
			}

			for _, sourceConfig := range sortedSourceConfigs {
				sourceConfig.StableSourceConfigID = stableSourceConfigId
				db.Save(sourceConfig)
			}
		}
	}
}

func findSourceConfigWithStableSourceConfigID(sourceConfigs []models.StackSourceConfig) string {
	for _, sc := range sourceConfigs {
		if sc.StableSourceConfigID != "" {
			return sc.StableSourceConfigID
		}
	}
	return ""
}

// sort source configs by creation date
func sortSourceConfigsByCreationDate(sourceConfigs []models.StackSourceConfig) []models.StackSourceConfig {
	for i := 0; i < len(sourceConfigs); i++ {
		for j := i + 1; j < len(sourceConfigs); j++ {
			if sourceConfigs[i].CreatedAt.After(sourceConfigs[j].CreatedAt) {
				sourceConfigs[i], sourceConfigs[j] = sourceConfigs[j], sourceConfigs[i]
			}
		}
	}

	return sourceConfigs
}
