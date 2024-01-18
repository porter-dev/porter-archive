package porter_app

import (
	"net/http"

	"connectrpc.com/connect"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
)

// AttachEnvGroupHandler is the handler for the /apps/attach-env-group endpoint
type AttachEnvGroupHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

// NewAttachEnvGroupHandler handles POST requests to the endpoint /apps/attach-env-group
func NewAttachEnvGroupHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *AttachEnvGroupHandler {
	return &AttachEnvGroupHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

// AttachEnvGroupRequest is the request object for the /apps/attach-env-group endpoint
type AttachEnvGroupRequest struct {
	EnvGroupName   string   `json:"env_group_name"`
	AppInstanceIDs []string `json:"app_instance_ids"`
}

// ServeHTTP translates the request into a AttachEnvGroup request, then calls update on the app with the env group
// The latest version of the env group will be attached (ccp makes sure of that)
func (c *AttachEnvGroupHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-attach-env-group")
	defer span.End()

	project, _ := ctx.Value(types.ProjectScope).(*models.Project)

	request := &AttachEnvGroupRequest{}
	if ok := c.DecodeAndValidate(w, r, request); !ok {
		err := telemetry.Error(ctx, span, nil, "error decoding request")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "env-group-name", Value: request.EnvGroupName})

	if request.EnvGroupName == "" {
		err := telemetry.Error(ctx, span, nil, "env group name cannot be empty")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	for _, appInstanceId := range request.AppInstanceIDs {
		appInstance, err := c.Repo().AppInstance().Get(ctx, appInstanceId)
		if err != nil {
			telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "app-instance-id", Value: appInstanceId})
			err := telemetry.Error(ctx, span, err, "error getting app instance")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}

		// TODO: delete second branch once all projects are on update flow
		if project.GetFeatureFlag(models.BetaFeaturesEnabled, c.Config().LaunchDarklyClient) {
			updateReq := connect.NewRequest(&porterv1.UpdateAppRequest{
				ProjectId: int64(project.ID),
				DeploymentTargetIdentifier: &porterv1.DeploymentTargetIdentifier{
					Id: appInstance.DeploymentTargetID.String(),
				},
				App: &porterv1.PorterApp{
					Name: appInstance.Name,
					EnvGroups: []*porterv1.EnvGroup{
						{
							Name: request.EnvGroupName,
						},
					},
				},
			})

			_, err = c.Config().ClusterControlPlaneClient.UpdateApp(ctx, updateReq)
			if err != nil {
				err := telemetry.Error(ctx, span, err, "error calling ccp update app")
				c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
				return
			}
		} else {
			validateReq := connect.NewRequest(&porterv1.ValidatePorterAppRequest{
				ProjectId:          int64(project.ID),
				DeploymentTargetId: appInstance.DeploymentTargetID.String(),
				App: &porterv1.PorterApp{
					Name: appInstance.Name,
					EnvGroups: []*porterv1.EnvGroup{
						{
							Name: request.EnvGroupName,
						},
					},
				},
			})
			ccpResp, err := c.Config().ClusterControlPlaneClient.ValidatePorterApp(ctx, validateReq)
			if err != nil {
				err := telemetry.Error(ctx, span, err, "error calling ccp validate porter app")
				c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
				return
			}

			if ccpResp == nil {
				err := telemetry.Error(ctx, span, err, "ccp resp is nil")
				c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
				return
			}
			if ccpResp.Msg == nil {
				err := telemetry.Error(ctx, span, err, "ccp resp msg is nil")
				c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
				return
			}

			if ccpResp.Msg.App == nil {
				err := telemetry.Error(ctx, span, err, "ccp resp app is nil")
				c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
				return
			}

			applyReq := connect.NewRequest(&porterv1.ApplyPorterAppRequest{
				ProjectId:          int64(project.ID),
				DeploymentTargetId: appInstance.DeploymentTargetID.String(),
				App:                ccpResp.Msg.App,
			})
			_, err = c.Config().ClusterControlPlaneClient.ApplyPorterApp(ctx, applyReq)
			if err != nil {
				err := telemetry.Error(ctx, span, err, "error calling ccp apply porter app")
				c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
				return
			}
		}
	}

	c.WriteResult(w, r, nil)
}
