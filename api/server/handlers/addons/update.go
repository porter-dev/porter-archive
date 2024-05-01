package addons

import (
	"encoding/base64"
	"net/http"

	"connectrpc.com/connect"
	"github.com/google/uuid"
	"github.com/porter-dev/api-contracts/generated/go/helpers"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
)

// UpdateAddonHandler handles requests to the /addons/update endpoint
type UpdateAddonHandler struct {
	handlers.PorterHandlerReadWriter
}

// NewUpdateAddonHandler returns a new UpdateAddonHandler
func NewUpdateAddonHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *UpdateAddonHandler {
	return &UpdateAddonHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

// UpdateAddonRequest represents the request for the /addons/update endpoint
type UpdateAddonRequest struct {
	B64Addon string `json:"b64_addon"`
}

func (c *UpdateAddonHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-update-addon")
	defer span.End()

	project, _ := ctx.Value(types.ProjectScope).(*models.Project)
	deploymentTarget, _ := ctx.Value(types.DeploymentTargetScope).(types.DeploymentTarget)

	request := &UpdateAddonRequest{}
	if ok := c.DecodeAndValidate(w, r, request); !ok {
		err := telemetry.Error(ctx, span, nil, "error decoding request")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	var deploymentTargetIdentifier *porterv1.DeploymentTargetIdentifier
	if deploymentTarget.ID != uuid.Nil {
		deploymentTargetIdentifier = &porterv1.DeploymentTargetIdentifier{
			Id: deploymentTarget.ID.String(),
		}
	}

	if request.B64Addon == "" {
		err := telemetry.Error(ctx, span, nil, "no addon provided")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	decoded, err := base64.StdEncoding.DecodeString(request.B64Addon)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error decoding yaml")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	addon := &porterv1.Addon{}
	err = helpers.UnmarshalContractObject(decoded, addon)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error unmarshalling addon")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	updateAddonRequest := connect.NewRequest(&porterv1.UpdateAddonRequest{
		ProjectId:                  int64(project.ID),
		DeploymentTargetIdentifier: deploymentTargetIdentifier,
		Addon:                      addon,
	})

	_, err = c.Config().ClusterControlPlaneClient.UpdateAddon(ctx, updateAddonRequest)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error updating addon")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	c.WriteResult(w, r, "")
}
