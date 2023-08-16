package porter_app

import (
	"encoding/base64"
	"net/http"

	"connectrpc.com/connect"

	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"

	"github.com/porter-dev/api-contracts/generated/go/helpers"

	"github.com/porter-dev/porter/internal/telemetry"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

// ApplyPorterAppHandler is the handler for the /app/parse endpoint
type ApplyPorterAppHandler struct {
	handlers.PorterHandlerReadWriter
}

// NewApplyPorterAppHandler returns a new ApplyPorterAppHandler
func NewApplyPorterAppHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *ApplyPorterAppHandler {
	return &ApplyPorterAppHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

// ApplyPorterAppRequest is the request object for the /apps/validate endpoint
type ApplyPorterAppRequest struct {
	Base64AppProto     string `json:"b64_app_proto"`
	DeploymentTargetId string `json:"deployment_target_id"`
}

// ApplyPorterAppResponse is the response object for the /apps/validate endpoint
type ApplyPorterAppResponse struct {
	AppRevisionId string                 `json:"app_revision_id"`
	CLIAction     porterv1.EnumCLIAction `json:"cli_action"`
}

// ServeHTTP receives a base64-encoded porter.yaml, parses the version, and then translates it into a base64-encoded app proto object
func (c *ApplyPorterAppHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-parse-porter-yaml")
	defer span.End()

	project, _ := ctx.Value(types.ProjectScope).(*models.Project)

	if !project.ValidateApplyV2 {
		err := telemetry.Error(ctx, span, nil, "project does not have validate apply v2 enabled")
		c.HandleAPIError(w, r, apierrors.NewErrForbidden(err))
		return
	}

	request := &ApplyPorterAppRequest{}
	if ok := c.DecodeAndValidate(w, r, request); !ok {
		err := telemetry.Error(ctx, span, nil, "error decoding request")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	if request.Base64AppProto == "" {
		err := telemetry.Error(ctx, span, nil, "b64 yaml is empty")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	decoded, err := base64.StdEncoding.DecodeString(request.Base64AppProto)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error decoding base  yaml")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	appProto := &porterv1.PorterApp{}
	err = helpers.UnmarshalContractObject(decoded, appProto)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error unmarshalling app proto")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	validateReq := connect.NewRequest(&porterv1.ApplyPorterAppRequest{
		ProjectId:           int64(project.ID),
		DeploymentTargetId:  request.DeploymentTargetId,
		App:                 appProto,
		PorterAppRevisionId: "",
	})
	ccpResp, err := c.Config().ClusterControlPlaneClient.ApplyPorterApp(ctx, validateReq)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error calling ccp apply porter app")
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

	if ccpResp.Msg.PorterAppRevisionId == "" {
		err := telemetry.Error(ctx, span, err, "ccp resp app revision id is nil")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	if ccpResp.Msg.CliAction == porterv1.EnumCLIAction_ENUM_CLI_ACTION_UNSPECIFIED {
		err := telemetry.Error(ctx, span, err, "ccp resp cli action is nil")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	response := &ApplyPorterAppResponse{
		AppRevisionId: ccpResp.Msg.PorterAppRevisionId,
		CLIAction:     ccpResp.Msg.CliAction,
	}

	c.WriteResult(w, r, response)
}
