package porter_app

import (
	"net/http"

	"connectrpc.com/connect"
	"github.com/google/uuid"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
)

type DeletePorterAppByNameHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewDeletePorterAppByNameHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *DeletePorterAppByNameHandler {
	return &DeletePorterAppByNameHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *DeletePorterAppByNameHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "server-delete-porter-app-by-name")
	defer span.End()

	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)
	project, _ := ctx.Value(types.ProjectScope).(*models.Project)

	appName, reqErr := requestutils.GetURLParamString(r, types.URLParamPorterAppName)
	if reqErr != nil {
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(reqErr, http.StatusBadRequest))
		return
	}

	porterApp, err := c.Repo().PorterApp().ReadPorterAppByName(cluster.ID, appName)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error reading porter app by name")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	delApp, err := c.Repo().PorterApp().DeletePorterApp(porterApp)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error deleting porter app")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	// this should be updated once multiple deployment targets are supported
	if project.ValidateApplyV2 {
		defaultDeploymentTarget, err := c.Repo().DeploymentTarget().DeploymentTargetBySelectorAndSelectorType(project.ID, cluster.ID, DeploymentTargetSelector_Default, DeploymentTargetSelectorType_Default)
		if err != nil {
			err := telemetry.Error(ctx, span, err, "error getting default deployment target from repo")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
			return
		}

		if defaultDeploymentTarget.ID == uuid.Nil {
			err := telemetry.Error(ctx, span, err, "default deployment target not found")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}

		deleteReq := connect.NewRequest(&porterv1.DeleteAppDeploymentRequest{
			ProjectId:          int64(project.ID),
			DeploymentTargetId: defaultDeploymentTarget.ID.String(),
			AppName:            porterApp.Name,
		})

		_, err = c.Config().ClusterControlPlaneClient.DeleteAppDeployment(ctx, deleteReq)
		if err != nil {
			err := telemetry.Error(ctx, span, err, "error calling ccp delete app deployment")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}
	}

	c.WriteResult(w, r, delApp)
}
