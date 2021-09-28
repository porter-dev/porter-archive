// +build !ee

package usage

import (
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

func GetLimit(config *config.Config, proj *models.Project) (limit *types.ProjectUsage, err error) {
	copyLimit := types.BasicPlan

	return &copyLimit, nil
}
