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

	sourceConfigsPerStack := make(map[uint]map[string][]*models.StackSourceConfig)

	for _, revision := range dest {
		if sourceConfigsPerStack[revision.StackID] == nil {
			sourceConfigsPerStack[revision.StackID] = make(map[string][]*models.StackSourceConfig)
		}

		for _, sc := range revision.SourceConfigs {
			sourceConfigsPerStack[revision.StackID][sc.Name] = append(sourceConfigsPerStack[revision.StackID][sc.Name], &sc)
		}
	}

	// Populate the stable source config id for each revision of the source config
	for _, sourceConfigs := range sourceConfigsPerStack {
		for _, v := range sourceConfigs {

			stableSourceConfigId := findSourceConfigWithStableSourceConfigID(v)

			if stableSourceConfigId == "" {
				stableSourceConfigId = v[0].UID
			}

			for _, sourceConfig := range v {
				sourceConfig.StableSourceConfigID = stableSourceConfigId
			}
		}
	}

	// Update the source configs in the database
	for _, sourceConfigs := range sourceConfigsPerStack {
		for _, v := range sourceConfigs {
			for _, sc := range v {
				db.Save(sc)
			}
		}
	}

}

func findSourceConfigWithStableSourceConfigID(sourceConfigs []*models.StackSourceConfig) string {
	for _, sc := range sourceConfigs {
		if sc.StableSourceConfigID != "" {
			return sc.StableSourceConfigID
		}
	}
	return ""
}
