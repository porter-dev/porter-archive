package porter_app

import (
	"encoding/base64"
	"net/http"

	"github.com/porter-dev/api-contracts/generated/go/helpers"

	"github.com/porter-dev/porter/internal/porter_app"

	"github.com/porter-dev/porter/internal/telemetry"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

// ParsePorterYAMLToProtoHandler is the handler for the /apps/parse endpoint
type ParsePorterYAMLToProtoHandler struct {
	handlers.PorterHandlerReadWriter
}

// NewParsePorterYAMLToProtoHandler returns a new ParsePorterYAMLToProtoHandler
func NewParsePorterYAMLToProtoHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *ParsePorterYAMLToProtoHandler {
	return &ParsePorterYAMLToProtoHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

// ParsePorterYAMLToProtoRequest is the request object for the /apps/parse endpoint
type ParsePorterYAMLToProtoRequest struct {
	B64Yaml string `json:"b64_yaml"`
	AppName string `json:"app_name"`
}

// ParsePorterYAMLToProtoResponse is the response object for the /apps/parse endpoint
type ParsePorterYAMLToProtoResponse struct {
	B64AppProto string `json:"b64_app_proto"`
}

// ServeHTTP receives a base64-encoded porter.yaml, parses the version, and then translates it into a base64-encoded app proto object
func (c *ParsePorterYAMLToProtoHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-parse-porter-yaml")
	defer span.End()

	project, _ := ctx.Value(types.ProjectScope).(*models.Project)

	if !project.ValidateApplyV2 {
		err := telemetry.Error(ctx, span, nil, "project does not have apply v2 enabled")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusForbidden))
		return
	}

	request := &ParsePorterYAMLToProtoRequest{}
	if ok := c.DecodeAndValidate(w, r, request); !ok {
		err := telemetry.Error(ctx, span, nil, "error decoding request")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	if request.B64Yaml == "" {
		err := telemetry.Error(ctx, span, nil, "b64 yaml is empty")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	yaml, err := base64.StdEncoding.DecodeString(request.B64Yaml)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error decoding b64 yaml")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	if yaml == nil {
		err := telemetry.Error(ctx, span, nil, "decoded yaml is nil")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	appProto, err := porter_app.ParseYAML(ctx, yaml, request.AppName)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error parsing yaml")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	if appProto == nil {
		err := telemetry.Error(ctx, span, nil, "app proto is nil")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	by, err := helpers.MarshalContractObject(ctx, appProto)
	if err != nil {
		err := telemetry.Error(ctx, span, nil, "error marshalling app proto")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	b64 := base64.StdEncoding.EncodeToString(by)

	response := &ParsePorterYAMLToProtoResponse{
		B64AppProto: b64,
	}

	c.WriteResult(w, r, response)
}
