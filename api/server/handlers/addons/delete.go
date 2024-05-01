package addons

import (
	"net/http"

	"connectrpc.com/connect"
	"github.com/google/uuid"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
)

// DeleteAddonHandler handles requests to the /addons/delete endpoint
type DeleteAddonHandler struct {
	handlers.PorterHandlerReadWriter
}

// NewDeleteAddonHandler returns a new DeleteAddonHandler
func NewDeleteAddonHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *DeleteAddonHandler {
	return &DeleteAddonHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *DeleteAddonHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-delete-addon")
	defer span.End()

	project, _ := ctx.Value(types.ProjectScope).(*models.Project)
	deploymentTarget, _ := ctx.Value(types.DeploymentTargetScope).(types.DeploymentTarget)

	addonName, reqErr := requestutils.GetURLParamString(r, types.URLParamAddonName)
	if reqErr != nil {
		err := telemetry.Error(ctx, span, reqErr, "error parsing addon name")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	var deploymentTargetIdentifier *porterv1.DeploymentTargetIdentifier
	if deploymentTarget.ID != uuid.Nil {
		deploymentTargetIdentifier = &porterv1.DeploymentTargetIdentifier{
			Id: deploymentTarget.ID.String(),
		}
	}

	if addonName == "" {
		err := telemetry.Error(ctx, span, nil, "no addon name provided")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	deleteAddonRequest := connect.NewRequest(&porterv1.DeleteAddonRequest{
		ProjectId:                  int64(project.ID),
		DeploymentTargetIdentifier: deploymentTargetIdentifier,
		AddonName:                  addonName,
	})

	_, err := c.Config().ClusterControlPlaneClient.DeleteAddon(ctx, deleteAddonRequest)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error deleting addon")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	c.WriteResult(w, r, "")
}
