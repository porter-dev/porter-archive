package environment_config

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
	"gorm.io/gorm"
)

type GetEnvConfigHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewGetEnvConfigHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *GetEnvConfigHandler {
	return &GetEnvConfigHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (c *GetEnvConfigHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-get-env-config")
	defer span.End()

	project, _ := ctx.Value(types.ProjectScope).(*models.Project)
	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)

	eci, reqErr := requestutils.GetURLParamString(r, types.URLParamEnvConfigID)
	if reqErr != nil {
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(reqErr, http.StatusBadRequest))
		return
	}

	envConfigId, err := strconv.Atoi(eci)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "Invalid configuration ID")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "cluster-id", Value: cluster.ID},
		telemetry.AttributeKV{Key: "project-id", Value: project.ID},
		telemetry.AttributeKV{Key: "env-config-id", Value: envConfigId},
	)

	envConf, err := c.Repo().EnvironmentConfig().ReadEnvironmentConfig(project.ID, cluster.ID, uint(envConfigId))
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			err = telemetry.Error(ctx, span, err, "Environment config not found")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusNotFound))
			return
		}
		err = telemetry.Error(ctx, span, err, "Failed to read environment config")
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	c.WriteResult(w, r, envConf.ToEnvironmentConfigType())
}
