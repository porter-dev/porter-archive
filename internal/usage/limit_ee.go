// +build ee

package usage

import (
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/ee/usage"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
)

var GetLimit func(repo repository.Repository, proj *models.Project) (limit *types.ProjectUsage, err error)

func init() {
	GetLimit = usage.GetLimit
}
