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

// CreateAppTemplateHandler is the handler for the /app-template endpoint
type CreateAppTemplateHandler struct {
	handlers.PorterHandlerReadWriter
}

// NewCreateAppTemplateHandler handles POST requests to the endpoint /app-template
func NewCreateAppTemplateHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *CreateAppTemplateHandler {
	return &CreateAppTemplateHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

// CreateAppTemplateRequest is the request object for the /app-template POST endpoint
type CreateAppTemplateRequest struct {
	B64AppProto string `json:"b64_app_proto"`
}

// CreateAppTemplateResponse is the response object for the /app-template POST endpoint
type CreateAppTemplateResponse struct {
	AppTemplateID string `json:"app_template_id"`
}

// ServeHTTP creates or updates an app template for a given porter app
func (c *CreateAppTemplateHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-create-app-template")
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

	request := &CreateAppTemplateRequest{}
	if ok := c.DecodeAndValidate(w, r, request); !ok {
		err := telemetry.Error(ctx, span, nil, "error decoding request")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	if request.B64AppProto == "" {
		err := telemetry.Error(ctx, span, nil, "b64 app proto is empty")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

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

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "porter-app-id", Value: porterApps[0].ID})

	var appTemplate *models.AppTemplate

	existingAppTemplate, err := c.Repo().AppTemplate().AppTemplateByPorterAppID(
		project.ID,
		porterApps[0].ID,
	)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error checking for existing app template")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	if existingAppTemplate.ID != uuid.Nil {
		appTemplate = existingAppTemplate
		telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "update-app-template", Value: true})
	}
	if appTemplate == nil {
		appTemplate = &models.AppTemplate{
			ProjectID:   int(project.ID),
			PorterAppID: int(porterApps[0].ID),
			Base64App:   request.B64AppProto,
		}
		telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "update-app-template", Value: false})
	}

	updatedAppTemplate, err := c.Repo().AppTemplate().CreateAppTemplate(appTemplate)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error creating app template")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	if updatedAppTemplate == nil {
		err := telemetry.Error(ctx, span, err, "updated app template is nil")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}
	if updatedAppTemplate.ID == uuid.Nil {
		err := telemetry.Error(ctx, span, err, "updated app template id is nil")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	res := &CreateAppTemplateResponse{
		AppTemplateID: updatedAppTemplate.ID.String(),
	}

	c.WriteResult(w, r, res)
}
