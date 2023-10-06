package porter_app

import (
	"context"
	"encoding/base64"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/porter-dev/api-contracts/generated/go/helpers"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/kubernetes/environment_groups"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/porter_app"
	"github.com/porter-dev/porter/internal/telemetry"
)

// CreateAppTemplateHandler is the handler for the /app-template endpoint
type CreateAppTemplateHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

// NewCreateAppTemplateHandler handles POST requests to the endpoint /app-template
func NewCreateAppTemplateHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *CreateAppTemplateHandler {
	return &CreateAppTemplateHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

// CreateAppTemplateRequest is the request object for the /app-template POST endpoint
type CreateAppTemplateRequest struct {
	B64AppProto string            `json:"b64_app_proto"`
	Variables   map[string]string `json:"variables"`
	Secrets     map[string]string `json:"secrets"`
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

	agent, err := c.GetAgent(r, cluster, "")
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error getting agent")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
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
		}
		telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "update-app-template", Value: false})
	}

	protoWithoutDefaultAppEnvGroups, err := filterDefaultAppEnvGroups(ctx, request.B64AppProto, agent)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error filtering default app env groups")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	appTemplate.Base64App = protoWithoutDefaultAppEnvGroups

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

	previewTemplateEnvName, err := porter_app.AppTemplateEnvGroupName(ctx, appName, cluster.ID, c.Repo().PorterApp())
	if err != nil {
		err := telemetry.Error(ctx, span, err, "unable to get app template env group name")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	envGroup, err := environment_groups.LatestBaseEnvironmentGroup(ctx, agent, previewTemplateEnvName)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "unable to get latest base environment group")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	if envGroup.Name == "" {
		envGroup = environment_groups.EnvironmentGroup{
			Name:         previewTemplateEnvName,
			CreatedAtUTC: time.Now().UTC(),
		}
	}
	envGroup.Variables = request.Variables
	envGroup.SecretVariables = request.Secrets

	additionalEnvGroupLabels := map[string]string{
		LabelKey_AppName: appName,
		environment_groups.LabelKey_DefaultAppEnvironment: "true",
		LabelKey_PorterManaged:                            "true",
	}

	err = environment_groups.CreateOrUpdateBaseEnvironmentGroup(ctx, agent, envGroup, additionalEnvGroupLabels)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "unable to create or update base environment group")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	err = porter_app.CreateAppWebhook(ctx, porter_app.CreateAppWebhookInput{
		PorterAppName:           appName,
		ProjectID:               project.ID,
		ClusterID:               cluster.ID,
		GithubAppSecret:         c.Config().ServerConf.GithubAppSecret,
		GithubAppID:             c.Config().ServerConf.GithubAppID,
		GithubWebhookSecret:     c.Config().ServerConf.GithubIncomingWebhookSecret,
		ServerURL:               c.Config().ServerConf.ServerURL,
		PorterAppRepository:     c.Repo().PorterApp(),
		GithubWebhookRepository: c.Repo().GithubWebhook(),
	})
	if err != nil {
		err := telemetry.Error(ctx, span, err, "unable to set repo webhook")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	res := &CreateAppTemplateResponse{
		AppTemplateID: updatedAppTemplate.ID.String(),
	}

	c.WriteResult(w, r, res)
}

// filterDefaultAppEnvGroups filters out any default app env groups found when creating an app template
// app templates are based on the latest version of a given app, so it is possible for this env group to be included
// however, the app template will get its own default env group when used to deploy to a preview environment
func filterDefaultAppEnvGroups(ctx context.Context, b64AppProto string, agent *kubernetes.Agent) (string, error) {
	ctx, span := telemetry.NewSpan(ctx, "filter-default-app-env-groups")
	defer span.End()

	var finalAppProto string

	if b64AppProto == "" {
		return finalAppProto, telemetry.Error(ctx, span, nil, "b64 app proto is empty")
	}
	if agent == nil {
		return finalAppProto, telemetry.Error(ctx, span, nil, "agent is nil")
	}

	decoded, err := base64.StdEncoding.DecodeString(b64AppProto)
	if err != nil {
		return finalAppProto, telemetry.Error(ctx, span, err, "error decoding base app")
	}

	appProto := &porterv1.PorterApp{}
	err = helpers.UnmarshalContractObject(decoded, appProto)
	if err != nil {
		return finalAppProto, telemetry.Error(ctx, span, err, "error unmarshalling app proto")
	}

	filteredEnvGroups := []*porterv1.EnvGroup{}
	for _, envGroup := range appProto.EnvGroups {
		baseEnvGroup, err := environment_groups.LatestBaseEnvironmentGroup(ctx, agent, envGroup.Name)
		if err != nil {
			return finalAppProto, telemetry.Error(ctx, span, err, "unable to get latest base environment group")
		}
		if baseEnvGroup.DefaultAppEnvironment {
			continue
		}

		filteredEnvGroups = append(filteredEnvGroups, envGroup)
	}

	appProto.EnvGroups = filteredEnvGroups

	encoded, err := helpers.MarshalContractObject(ctx, appProto)
	if err != nil {
		return finalAppProto, telemetry.Error(ctx, span, err, "error marshalling app proto")
	}

	finalAppProto = base64.StdEncoding.EncodeToString(encoded)

	return finalAppProto, nil
}
