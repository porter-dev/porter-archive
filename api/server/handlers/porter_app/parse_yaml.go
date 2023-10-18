package porter_app

import (
	"context"
	"encoding/base64"
	"net/http"

	"github.com/porter-dev/api-contracts/generated/go/helpers"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"

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

// EncodedAppWithEnv is a struct that contains a base64-encoded app proto object and a map of env variables
type EncodedAppWithEnv struct {
	B64AppProto  string            `json:"b64_app_proto"`
	EnvVariables map[string]string `json:"env_variables"`
	EnvSecrets   map[string]string `json:"env_secrets"`
}

// EncodedAppDefinition is a full app definition with encoded app proto and env variables
type EncodedAppDefinition struct {
	EncodedAppWithEnv
	// PreviewApp contains preview environment specific overrides, if they exist
	PreviewApp *EncodedAppWithEnv `json:"preview_app,omitempty"`
}

// ParsePorterYAMLToProtoResponse is the response object for the /apps/parse endpoint
type ParsePorterYAMLToProtoResponse struct {
	ParsedApps []EncodedAppDefinition `json:"parsed_apps"`
}

// ServeHTTP receives a base64-encoded porter.yaml, parses the version, and then translates it into a base64-encoded app proto object
func (c *ParsePorterYAMLToProtoHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-parse-porter-yaml")
	defer span.End()

	project, _ := ctx.Value(types.ProjectScope).(*models.Project)

	if !project.GetFeatureFlag(models.ValidateApplyV2, c.Config().LaunchDarklyClient) {
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

	appDefinitions, err := porter_app.ParseYAML(ctx, yaml, request.AppName)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error parsing yaml")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	if appDefinitions == nil {
		err := telemetry.Error(ctx, span, nil, "app proto is nil")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	response := &ParsePorterYAMLToProtoResponse{
		ParsedApps: make([]EncodedAppDefinition, 0),
	}

	for _, appDefinition := range appDefinitions {
		var app EncodedAppDefinition

		encodedApp, err := encodeAppProto(ctx, appDefinition.AppProto)
		if err != nil {
			err := telemetry.Error(ctx, span, err, "error encoding app proto")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}
		app.B64AppProto = encodedApp
		app.EnvVariables = appDefinition.EnvVariables

		if appDefinition.PreviewApp != nil {
			encodedPreviewApp, err := encodeAppProto(ctx, appDefinition.PreviewApp.AppProto)
			if err != nil {
				err := telemetry.Error(ctx, span, err, "error encoding preview app proto")
				c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
				return
			}
			app.PreviewApp = &EncodedAppWithEnv{
				B64AppProto:  encodedPreviewApp,
				EnvVariables: appDefinition.PreviewApp.EnvVariables,
			}
			telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "includes-preview-app", Value: true})
		}

		response.ParsedApps = append(response.ParsedApps, app)
	}

	c.WriteResult(w, r, response)
}

func encodeAppProto(ctx context.Context, app *porterv1.PorterApp) (string, error) {
	ctx, span := telemetry.NewSpan(ctx, "encode-app-proto")
	defer span.End()

	var encodedApp string

	by, err := helpers.MarshalContractObject(ctx, app)
	if err != nil {
		return encodedApp, err
	}

	encodedApp = base64.StdEncoding.EncodeToString(by)

	return encodedApp, nil
}
