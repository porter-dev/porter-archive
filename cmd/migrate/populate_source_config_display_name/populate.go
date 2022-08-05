package populate_source_config_display_name

import (
	"github.com/porter-dev/porter/internal/models"
	lr "github.com/porter-dev/porter/pkg/logger"
	_gorm "gorm.io/gorm"
)

func PopulateSourceConfigDisplayName(db *_gorm.DB, logger *lr.Logger) error {
	logger.Info().Msg("Initiated source config display name population")
	// get all source configs
	sourceConfigs := make([]*models.StackSourceConfig, 0)

	if err := db.Find(&sourceConfigs).Error; err != nil {
		logger.Error().Msgf("failed to get source configs %v", err)
		return err
	}

	if len(sourceConfigs) == 0 {
		logger.Info().Msg("no source configs to populate")
		return nil
	}

	updatedCount := 0
	// copy name to display name if display name is empty
	for _, sourceConfig := range sourceConfigs {
		if sourceConfig.DisplayName == "" {
			sourceConfig.DisplayName = sourceConfig.Name
			updatedCount++
		}
	}
	// update source configs
	if err := db.Save(&sourceConfigs).Error; err != nil {
		logger.Error().Msgf("failed to update source configs %v", err)
		return err
	}

	logger.Info().Msgf("source config display name population completed, %d source configs updated", updatedCount)
	return nil
}
