// +build ee

package usage

import (
	"errors"

	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"gorm.io/gorm"
)

func GetLimit(config *config.Config, proj *models.Project) (limit *types.ProjectUsage, err error) {
	// query for the project limit; if not found, default to basic
	limitModel, err := config.Repo.ProjectUsage().ReadProjectUsage(proj.ID)

	if err != nil && errors.Is(err, gorm.ErrRecordNotFound) {
		copyBasic := types.BasicPlan
		limit = &copyBasic
	} else if err != nil {
		return nil, err
	} else {
		limit = limitModel.ToProjectUsageType()
	}

	return limit, nil
}
