package enable_cluster_preview_envs

import (
	"github.com/porter-dev/porter/internal/models"
	lr "github.com/porter-dev/porter/pkg/logger"
	_gorm "gorm.io/gorm"
)

func EnableClusterPreviewEnvs(db *_gorm.DB, logger *lr.Logger) error {
	logger.Info().Msg("starting to enable preview envs for existing clusters whose parent projects have preview envs enabled")

	var clusters []*models.Cluster

	if err := db.Find(&clusters).Error; err != nil {
		logger.Error().Msgf("failed to get clusters: %v", err)
		return err
	}

	for _, c := range clusters {
		project := &models.Project{}

		if err := db.Model(project).Where("id = ?", c.ProjectID).First(project).Error; err != nil {
			logger.Error().Msgf("failed to get project ID %d for cluster ID %d: %v", c.ProjectID, c.ID, err)
			continue
		}

		if project.PreviewEnvsEnabled {
			c.PreviewEnvsEnabled = true

			if err := db.Save(c).Error; err != nil {
				logger.Error().Msgf("failed to update cluster ID %d: %v", c.ID, err)
				return err
			}

			logger.Info().Msgf("enabled preview envs for cluster ID %d", c.ID)
		}
	}

	logger.Info().Msg("cluster preview envs migration completed")

	return nil
}
