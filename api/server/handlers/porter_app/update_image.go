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
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
)

// UpdateImageHandler is the handler for the /apps/{porter_app_name}/update-image endpoint
type UpdateImageHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

// NewUpdateImageHandler handles POST requests to the /apps/{porter_app_name}/update-image endpoint
func NewUpdateImageHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *UpdateImageHandler {
	return &UpdateImageHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

// UpdateImageRequest is the request object for the /apps/{porter_app_name}/update-image endpoint
type UpdateImageRequest struct {
	DeploymentTargetId   string `json:"deployment_target_id"`
	DeploymentTargetName string `json:"deployment_target_name"`
	Repository           string `json:"repository"`
	Tag                  string `json:"tag"`
}

// UpdateImageResponse is the response object for the /apps/{porter_app_name}/update-image endpoint
type UpdateImageResponse struct {
	Repository string `json:"repository"`
	Tag        string `json:"tag"`
}

func (c *UpdateImageHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-update-image")
	defer span.End()

	project, _ := ctx.Value(types.ProjectScope).(*models.Project)

	if !project.GetFeatureFlag(models.ValidateApplyV2, c.Config().LaunchDarklyClient) {
		err := telemetry.Error(ctx, span, nil, "project does not have validate apply v2 enabled")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusForbidden))
		return
	}

	appName, reqErr := requestutils.GetURLParamString(r, types.URLParamPorterAppName)
	if reqErr != nil {
		err := telemetry.Error(ctx, span, nil, "error parsing app name")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "app-name", Value: appName})

	request := &UpdateImageRequest{}
	if ok := c.DecodeAndValidate(w, r, request); !ok {
		err := telemetry.Error(ctx, span, nil, "error decoding request")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "deployment-target-id", Value: request.DeploymentTargetId},
		telemetry.AttributeKV{Key: "deployment-target-name", Value: request.DeploymentTargetName},
		telemetry.AttributeKV{Key: "repository", Value: request.Repository},
		telemetry.AttributeKV{Key: "tag", Value: request.Tag},
	)

	updateImageReq := connect.NewRequest(&porterv1.UpdateAppImageRequest{
		ProjectId:     int64(project.ID),
		RepositoryUrl: request.Repository,
		Tag:           request.Tag,
		AppName:       appName,
		DeploymentTargetIdentifier: &porterv1.DeploymentTargetIdentifier{
			Id:   request.DeploymentTargetId,
			Name: request.DeploymentTargetName,
		},
	})
	ccpResp, err := c.Config().ClusterControlPlaneClient.UpdateAppImage(ctx, updateImageReq)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error calling ccp update porter app image")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	res := &UpdateImageResponse{
		Repository: ccpResp.Msg.RepositoryUrl,
		Tag:        ccpResp.Msg.Tag,
	}

	c.WriteResult(w, r, res)
}
