// +build !ee

package usage

import (
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
)

func GetLimit(repo repository.Repository, proj *models.Project) (limit *types.ProjectUsage, err error) {
	copyLimit := types.BasicPlan

	return &copyLimit, nil
}
