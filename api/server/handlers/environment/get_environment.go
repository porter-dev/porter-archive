package environment

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"gorm.io/gorm"
)

type GetEnvironmentHandler struct {
	handlers.PorterHandlerWriter
}

func NewGetEnvironmentHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *GetEnvironmentHandler {
	return &GetEnvironmentHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (c *GetEnvironmentHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	project, _ := r.Context().Value(types.ProjectScope).(*models.Project)
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	envID, reqErr := requestutils.GetURLParamUint(r, "environment_id")

	if reqErr != nil {
		c.HandleAPIError(w, r, reqErr)
		return
	}

	env, err := c.Repo().Environment().ReadEnvironmentByID(project.ID, cluster.ID, envID)

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.HandleAPIError(w, r, apierrors.NewErrNotFound(fmt.Errorf("no such environment with ID: %d", envID)))
			return
		}

		c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error reading environment with ID: %d. Error: %w", envID, err)))
		return
	}

	c.WriteResult(w, r, env.ToEnvironmentType())
}
