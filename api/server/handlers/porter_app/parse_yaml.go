package porter_app

import (
	"context"
	"encoding/base64"
	"net/http"

	"github.com/porter-dev/api-contracts/generated/go/helpers"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"

	"github.com/porter-dev/porter/internal/porter_app"
	v2 "github.com/porter-dev/porter/internal/porter_app/v2"

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
	B64Yaml         string              `json:"b64_yaml"`
	AppName         string              `json:"app_name"`
	PatchOperations []v2.PatchOperation `json:"patch_operations"`
}

// EncodedAppWithEnv is a struct that contains a base64-encoded app proto object and a map of env variables
type EncodedAppWithEnv struct {
	B64AppProto  string            `json:"b64_app_proto"`
	EnvVariables map[string]string `json:"env_variables"`
	EnvSecrets   map[string]string `json:"env_secrets"`
	B64Addons    []string          `json:"b64_addons"`
}

// ParsePorterYAMLToProtoResponse is the response object for the /apps/parse endpoint
type ParsePorterYAMLToProtoResponse struct {
	EncodedAppWithEnv
	// PreviewApp contains preview environment specific overrides, if they exist
	PreviewApp *EncodedAppWithEnv `json:"preview_app,omitempty"`
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

	appDefinition, err := porter_app.ParseYAML(ctx, yaml, request.AppName)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error parsing yaml")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	if appDefinition.AppProto == nil {
		err := telemetry.Error(ctx, span, nil, "app proto is nil")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	patchedProto, err := v2.PatchApp(ctx, appDefinition.AppProto, request.PatchOperations)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error patching app proto")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	response := &ParsePorterYAMLToProtoResponse{}

	encodedApp, err := encodeAppProto(ctx, patchedProto)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error encoding app proto")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}
	response.B64AppProto = encodedApp
	response.EnvVariables = appDefinition.EnvVariables

	encodedAddons, err := encodeAddonProtos(ctx, appDefinition.Addons)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error encoding addon protos")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}
	response.B64Addons = encodedAddons

	if appDefinition.PreviewApp != nil {
		encodedPreviewApp, err := encodeAppProto(ctx, appDefinition.PreviewApp.AppProto)
		if err != nil {
			err := telemetry.Error(ctx, span, err, "error encoding preview app proto")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}

		encodedPreviewAddons, err := encodeAddonProtos(ctx, appDefinition.PreviewApp.Addons)
		if err != nil {
			err := telemetry.Error(ctx, span, err, "error encoding preview addon protos")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}

		response.PreviewApp = &EncodedAppWithEnv{
			B64AppProto:  encodedPreviewApp,
			EnvVariables: appDefinition.PreviewApp.EnvVariables,
			B64Addons:    encodedPreviewAddons,
		}
		telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "includes-preview-app", Value: true})
	}

	c.WriteResult(w, r, response)
}

func encodeAppProto(ctx context.Context, app *porterv1.PorterApp) (string, error) {
	ctx, span := telemetry.NewSpan(ctx, "encode-app-proto")
	defer span.End()

	var encodedApp string

	by, err := helpers.MarshalContractObject(ctx, app)
	if err != nil {
		return encodedApp, telemetry.Error(ctx, span, err, "error marshaling app proto")
	}

	encodedApp = base64.StdEncoding.EncodeToString(by)

	return encodedApp, nil
}

func encodeAddonProtos(ctx context.Context, addons []*porterv1.Addon) ([]string, error) {
	ctx, span := telemetry.NewSpan(ctx, "encode-addon-proto")
	defer span.End()

	var encodedAddons []string

	for _, addon := range addons {
		by, err := helpers.MarshalContractObject(ctx, addon)
		if err != nil {
			return encodedAddons, telemetry.Error(ctx, span, err, "error marshaling addon proto")
		}

		encodedAddon := base64.StdEncoding.EncodeToString(by)
		encodedAddons = append(encodedAddons, encodedAddon)
	}

	return encodedAddons, nil
}
