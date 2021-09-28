// +build ee

package usage

import (
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/ee/usage"
	"github.com/porter-dev/porter/internal/models"
)

var GetLimit func(config *config.Config, proj *models.Project) (limit *types.ProjectUsage, err error)

func init() {
	GetLimit = usage.GetLimit
}
