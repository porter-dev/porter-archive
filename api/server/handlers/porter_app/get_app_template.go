package porter_app

import (
	"context"
	"encoding/base64"
	"net/http"

	"connectrpc.com/connect"
	"github.com/porter-dev/api-contracts/generated/go/helpers"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/kubernetes/environment_groups"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
)

// GetAppTemplateHandler is the handler for the /apps/{porter_app_name}/templates endpoint
type GetAppTemplateHandler struct {
	handlers.PorterHandlerReadWriter
}

// NewGetAppTemplateHandler handles GET requests to the endpoint /apps/{porter_app_name}/templates
func NewGetAppTemplateHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *GetAppTemplateHandler {
	return &GetAppTemplateHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

// GetAppTemplateResponse is the response object for the /apps/{porter_app_name}/templates GET endpoint
type GetAppTemplateResponse struct {
	// Template is the set of app overrides explicitly set by the user to be used in subsequent preview deploys
	TemplateB64AppProto string `json:"template_b64_app_proto"`
	// AppEnv is the base set of environment variables that will be used in subsequent preview deploys
	AppEnv environment_groups.EnvironmentGroup `json:"app_env"`
	// Addons is a list of encoded addons that will be used alongside the app template
	Addons []Base64AddonWithEnvVars `json:"addons"`
}

// ServeHTTP creates or updates an app template for a given porter app
func (c *GetAppTemplateHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-get-app-template")
	defer span.End()

	project, _ := ctx.Value(types.ProjectScope).(*models.Project)
	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)

	if !project.GetFeatureFlag(models.ValidateApplyV2, c.Config().LaunchDarklyClient) {
		err := telemetry.Error(ctx, span, nil, "project does not have validate apply v2 enabled")
		c.HandleAPIError(w, r, apierrors.NewErrForbidden(err))
		return
	}

	appName, reqErr := requestutils.GetURLParamString(r, types.URLParamPorterAppName)
	if reqErr != nil {
		e := telemetry.Error(ctx, span, reqErr, "error parsing stack name from url")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusBadRequest))
		return
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "app-name", Value: appName})

	app, err := c.Repo().PorterApp().ReadPorterAppByName(cluster.ID, appName)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error getting porter app from repo")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	if app.ID == 0 {
		err := telemetry.Error(ctx, span, err, "porter app id is missing")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	templateReq := connect.NewRequest(&porterv1.AppTemplateRequest{
		ProjectId: int64(project.ID),
		AppId:     int64(app.ID),
	})

	ccpResp, err := c.Config().ClusterControlPlaneClient.AppTemplate(ctx, templateReq)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error getting app template")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	if ccpResp == nil || ccpResp.Msg == nil {
		err := telemetry.Error(ctx, span, err, "app template resp is nil")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	appTemplate := ccpResp.Msg.AppTemplate

	by, err := helpers.MarshalContractObject(ctx, appTemplate)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error marshaling app template")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	encoded := base64.StdEncoding.EncodeToString(by)

	appEnv := environment_groups.EnvironmentGroup{
		Variables:       ccpResp.Msg.AppEnv.Normal,
		SecretVariables: ccpResp.Msg.AppEnv.Secret,
	}

	addons := encodedAddonsWithEnvFromProto(ctx, ccpResp.Msg.AddonTemplates)

	res := &GetAppTemplateResponse{
		TemplateB64AppProto: encoded,
		AppEnv:              appEnv,
		Addons:              addons,
	}

	c.WriteResult(w, r, res)
}

func encodedAddonsWithEnvFromProto(ctx context.Context, addons []*porterv1.AddonWithEnvVars) []Base64AddonWithEnvVars {
	var res []Base64AddonWithEnvVars

	for _, addon := range addons {
		by, _ := helpers.MarshalContractObject(ctx, addon.Addon)

		encoded := base64.StdEncoding.EncodeToString(by)

		res = append(res, Base64AddonWithEnvVars{
			Base64Addon: encoded,
			Variables:   addon.EnvVars.Normal,
			Secrets:     addon.EnvVars.Secret,
		})
	}

	return res
}
