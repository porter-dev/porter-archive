package stable_source_config_id_population

import (
	"github.com/porter-dev/porter/internal/models"
	lr "github.com/porter-dev/porter/pkg/logger"
	_gorm "gorm.io/gorm"
)

func PopulateStableSourceConfigId(db *_gorm.DB, logger *lr.Logger) {
	logger.Info().Msg("Start populating stable source config id")

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

	populatedSourceConfigs := []models.StackSourceConfig{}

	// Populate the stable source config id for each revision of the source config
	for _, sourceConfigsWithSameNameMap := range sourceConfigsPerStack {
		for _, sc := range sourceConfigsWithSameNameMap {

			// If all source configs have the same stable source config id, then we can skip this step
			if allSourceConfigsHaveSameStableSourceConfigID(sc) {
				logger.Info().Msgf("Skipping source configs with stable source config id %s", sc[0].StableSourceConfigID)
				continue
			}

			sortedSourceConfigs := sortSourceConfigsByCreationDate(sc)

			stableSourceConfigId := findSourceConfigWithStableSourceConfigID(sortedSourceConfigs)

			if stableSourceConfigId == "" {
				stableSourceConfigId = sortedSourceConfigs[0].UID
			}

			for _, sourceConfig := range sortedSourceConfigs {
				if sourceConfig.StableSourceConfigID != "" && sourceConfig.StableSourceConfigID != stableSourceConfigId {
					logger.Warn().Msgf("source config %s has a different stable source config id %s than %s", sourceConfig.UID, sourceConfig.StableSourceConfigID, stableSourceConfigId)
					logger.Warn().Msg("This may cause issues with the stack, continuing anyways.")
				}

				logger.Info().Msg("Populating stable source config id for source config " + sourceConfig.UID)
				sourceConfig.StableSourceConfigID = stableSourceConfigId
				populatedSourceConfigs = append(populatedSourceConfigs, sourceConfig)
			}
		}
	}

	for _, sc := range populatedSourceConfigs {
		if err := db.Save(sc).Error; err != nil {
			logger.Error().Err(err).Msgf("Failed to save source config with UID %s", sc.UID)
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

// Check if all source configs in the array have populated the same StableSourceConfigID
func allSourceConfigsHaveSameStableSourceConfigID(sourceConfigs []models.StackSourceConfig) bool {
	if len(sourceConfigs) == 0 {
		return true
	}
	stableSourceConfigID := sourceConfigs[0].StableSourceConfigID

	if stableSourceConfigID == "" {
		return false
	}

	for _, sc := range sourceConfigs {
		if sc.StableSourceConfigID != stableSourceConfigID {
			return false
		}
	}

	return true
}
