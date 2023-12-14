package porter_app

import (
	"context"
	"encoding/base64"
	"net/http"

	"connectrpc.com/connect"
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

// Base64AddonWithEnvVars is a struct that contains a base64 encoded addon proto and its env vars
// These env vars will be used to create an env group that is attached to the addon
type Base64AddonWithEnvVars struct {
	Base64Addon string            `json:"base64_addon"`
	Variables   map[string]string `json:"variables"`
	Secrets     map[string]string `json:"secrets"`
}

// CreateAppTemplateRequest is the request object for the /app-template POST endpoint
type CreateAppTemplateRequest struct {
	B64AppProto            string                   `json:"b64_app_proto"`
	Variables              map[string]string        `json:"variables"`
	Secrets                map[string]string        `json:"secrets"`
	BaseDeploymentTargetID string                   `json:"base_deployment_target_id"`
	Addons                 []Base64AddonWithEnvVars `json:"addons"`
}

// CreateAppTemplateResponse is the response object for the /app-template POST endpoint
type CreateAppTemplateResponse struct{}

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

	baseDeploymentTarget, err := uuid.Parse(request.BaseDeploymentTargetID)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error parsing base deployment target id")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	if baseDeploymentTarget == uuid.Nil {
		err := telemetry.Error(ctx, span, err, "base deployment target id is nil")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	agent, err := c.GetAgent(r, cluster, "")
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error getting agent")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	protoWithoutDefaultAppEnvGroups, err := filterDefaultAppEnvGroups(ctx, request.B64AppProto, agent)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error filtering default app env groups")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	var addonTemplates []*porterv1.AddonWithEnvVars
	for _, addon := range request.Addons {
		decoded, err := base64.StdEncoding.DecodeString(addon.Base64Addon)
		if err != nil {
			err := telemetry.Error(ctx, span, err, "error decoding base64 addon")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}

		addonProto := &porterv1.Addon{}
		err = helpers.UnmarshalContractObject(decoded, addonProto)
		if err != nil {
			err := telemetry.Error(ctx, span, err, "error unmarshalling addon proto")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}

		addonTemplates = append(addonTemplates, &porterv1.AddonWithEnvVars{
			Addon: addonProto,
			EnvVars: &porterv1.EnvGroupVariables{
				Normal: addon.Variables,
				Secret: addon.Secrets,
			},
		})
	}

	updateAppTemplateReq := connect.NewRequest(&porterv1.UpdateAppTemplateRequest{
		ProjectId:   int64(project.ID),
		AppName:     appName,
		AppTemplate: protoWithoutDefaultAppEnvGroups,
		AppEnv: &porterv1.EnvGroupVariables{
			Normal: request.Variables,
			Secret: request.Secrets,
		},
		AddonTemplates:         addonTemplates,
		BaseDeploymentTargetId: baseDeploymentTarget.String(),
	})

	updateAppTemplateRes, err := c.Config().ClusterControlPlaneClient.UpdateAppTemplate(ctx, updateAppTemplateReq)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error updating app template")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	if updateAppTemplateRes == nil || updateAppTemplateRes.Msg == nil {
		err := telemetry.Error(ctx, span, err, "error updating app template")
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

	res := &CreateAppTemplateResponse{}

	c.WriteResult(w, r, res)
}

// filterDefaultAppEnvGroups filters out any default app env groups found when creating an app template
// app templates are based on the latest version of a given app, so it is possible for this env group to be included
// however, the app template will get its own default env group when used to deploy to a preview environment
func filterDefaultAppEnvGroups(ctx context.Context, b64AppProto string, agent *kubernetes.Agent) (*porterv1.PorterApp, error) {
	ctx, span := telemetry.NewSpan(ctx, "filter-default-app-env-groups")
	defer span.End()

	appProto := &porterv1.PorterApp{}

	if b64AppProto == "" {
		return appProto, telemetry.Error(ctx, span, nil, "b64 app proto is empty")
	}
	if agent == nil {
		return appProto, telemetry.Error(ctx, span, nil, "agent is nil")
	}

	decoded, err := base64.StdEncoding.DecodeString(b64AppProto)
	if err != nil {
		return appProto, telemetry.Error(ctx, span, err, "error decoding base app")
	}

	err = helpers.UnmarshalContractObject(decoded, appProto)
	if err != nil {
		return appProto, telemetry.Error(ctx, span, err, "error unmarshalling app proto")
	}

	filteredEnvGroups := []*porterv1.EnvGroup{}
	for _, envGroup := range appProto.EnvGroups {
		baseEnvGroup, err := environment_groups.LatestBaseEnvironmentGroup(ctx, agent, envGroup.Name)
		if err != nil {
			return appProto, telemetry.Error(ctx, span, err, "unable to get latest base environment group")
		}
		if baseEnvGroup.DefaultAppEnvironment {
			continue
		}

		filteredEnvGroups = append(filteredEnvGroups, envGroup)
	}

	appProto.EnvGroups = filteredEnvGroups

	return appProto, nil
}
