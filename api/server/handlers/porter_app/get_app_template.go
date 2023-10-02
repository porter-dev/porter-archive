package porter_app

import (
	"net/http"

	"github.com/google/uuid"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
)

// GetAppTemplateHandler is the handler for the /app-template endpoint
type GetAppTemplateHandler struct {
	handlers.PorterHandlerReadWriter
}

// NewGetAppTemplateHandler handles GET requests to the endpoint /apps/{porter_app_name}/app-template
func NewGetAppTemplateHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *GetAppTemplateHandler {
	return &GetAppTemplateHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

// GetAppTemplateResponse is the response object for the /apps/{porter_app_name}/app-template GET endpoint
type GetAppTemplateResponse struct {
	TemplateB64AppProto string `json:"template_b64_app_proto"`
}

// ServeHTTP creates or updates an app template for a given porter app
func (c *GetAppTemplateHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-get-app-template")
	defer span.End()

	project, _ := ctx.Value(types.ProjectScope).(*models.Project)

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

	porterApps, err := c.Repo().PorterApp().ReadPorterAppsByProjectIDAndName(project.ID, appName)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error getting porter app from repo")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	if len(porterApps) == 0 {
		err := telemetry.Error(ctx, span, err, "no porter apps returned")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	if len(porterApps) > 1 {
		err := telemetry.Error(ctx, span, err, "multiple porter apps returned; unable to determine which one to use")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	if porterApps[0].ID == 0 {
		err := telemetry.Error(ctx, span, err, "porter app id is missing")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	appTemplate, err := c.Repo().AppTemplate().AppTemplateByPorterAppID(
		project.ID,
		porterApps[0].ID,
	)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error checking for existing app template")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}
	if appTemplate == nil {
		err := telemetry.Error(ctx, span, err, "no app template found")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusNotFound))
		return
	}
	if appTemplate.ID == uuid.Nil {
		err := telemetry.Error(ctx, span, err, "app template id is missing")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	res := &GetAppTemplateResponse{
		TemplateB64AppProto: appTemplate.Base64App,
	}

	c.WriteResult(w, r, res)
}
