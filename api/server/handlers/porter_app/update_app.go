package porter_app

import (
	"encoding/base64"
	"net/http"

	"connectrpc.com/connect"
	"github.com/porter-dev/api-contracts/generated/go/helpers"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/deployment_target"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/porter_app"
	v2 "github.com/porter-dev/porter/internal/porter_app/v2"
	"github.com/porter-dev/porter/internal/telemetry"
)

// UpdateAppHandler is the handler for the POST /apps/{porter_app_name} endpoint
type UpdateAppHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

// NewUpdateAppHandler handles POST requests to the endpoint POST /apps/{porter_app_name}
func NewUpdateAppHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *UpdateAppHandler {
	return &UpdateAppHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

// UpdateAppRequest is the request object for the POST /apps/{porter_app_name} endpoint
type UpdateAppRequest struct {
	// DeploymentTargetId is the ID of the deployment target to apply the update to
	DeploymentTargetId string `json:"deployment_target_id"`
	// Variables is a map of environment variable names to values
	Variables map[string]string `json:"variables"`
	// Secrets is a map of secret names to values
	Secrets map[string]string `json:"secrets"`
	// Deletions is the set of fields to delete before applying the update
	Deletions Deletions `json:"deletions"`
	// CommitSHA is the commit sha of the git commit that triggered this update, indicating a source change and triggering a build
	CommitSHA string `json:"commit_sha"`
	// AppRevisionID is the ID of the revision to perform follow up actions on after the initial apply
	AppRevisionID string `json:"app_revision_id"`
	// Only one of Base64AppProto or Base64PorterYAML should be specified
	// Base64AppProto is a ful base64 encoded porter app contract to apply
	Base64AppProto string `json:"b64_app_proto"`
	// Base64PorterYAML is a base64 encoded porter yaml to apply representing a potentially partial porter app contract
	Base64PorterYAML string `json:"b64_porter_yaml"`
	// IsEnvOverride is used to remove any variables that are not specified in the request.  If false, the request will only update the variables specified in the request,
	// and leave all other variables untouched.
	IsEnvOverride bool `json:"is_env_override"`
	// IsAwaitingPredeploy indicates that a successful build has completed and predeploy should be run, if applicable.
	IsAwaitingPredeploy bool `json:"is_awaiting_predeploy"`
}

// UpdateAppResponse is the response object for the POST /apps/{porter_app_name} endpoint
type UpdateAppResponse struct {
	AppRevisionId string                 `json:"app_revision_id"`
	CLIAction     porterv1.EnumCLIAction `json:"cli_action"`
}

// ServeHTTP translates the request into an UpdateApp request, forwards to the cluster control plane, and returns the response
func (c *UpdateAppHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-update-app")
	defer span.End()

	project, _ := ctx.Value(types.ProjectScope).(*models.Project)
	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)

	appName, reqErr := requestutils.GetURLParamString(r, types.URLParamPorterAppName)
	if reqErr != nil {
		err := telemetry.Error(ctx, span, nil, "error parsing porter app name")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "application-name", Value: appName})

	request := &UpdateAppRequest{}
	if ok := c.DecodeAndValidate(w, r, request); !ok {
		err := telemetry.Error(ctx, span, nil, "error decoding request")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	if request.Base64AppProto != "" && request.Base64PorterYAML != "" {
		err := telemetry.Error(ctx, span, nil, "both b64 yaml and b64 porter yaml are specified")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	if request.DeploymentTargetId == "" {
		err := telemetry.Error(ctx, span, nil, "deployment target id is empty")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	deploymentTargetID := request.DeploymentTargetId

	var overrides *porterv1.PorterApp
	appProto := &porterv1.PorterApp{}

	envVariables := request.Variables

	if request.Base64AppProto != "" {
		decoded, err := base64.StdEncoding.DecodeString(request.Base64AppProto)
		if err != nil {
			err := telemetry.Error(ctx, span, err, "error decoding base yaml")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
			return
		}

		err = helpers.UnmarshalContractObject(decoded, appProto)
		if err != nil {
			err := telemetry.Error(ctx, span, err, "error unmarshalling app proto")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
			return
		}
	}

	if request.Base64PorterYAML != "" {
		decoded, err := base64.StdEncoding.DecodeString(request.Base64PorterYAML)
		if err != nil {
			err := telemetry.Error(ctx, span, err, "error decoding base yaml")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
			return
		}

		appFromYaml, err := porter_app.ParseYAML(ctx, decoded, appName)
		if err != nil {
			err := telemetry.Error(ctx, span, err, "error parsing yaml")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
			return
		}
		appProto = appFromYaml.AppProto

		// only public variables can be defined in porter.yaml
		envVariables = mergeEnvVariables(request.Variables, appFromYaml.EnvVariables)

		if appFromYaml.PreviewApp != nil {
			overrides = appFromYaml.PreviewApp.AppProto
			envVariables = mergeEnvVariables(envVariables, appFromYaml.PreviewApp.EnvVariables)
		}
	}

	var appRevisionID string
	if request.AppRevisionID != "" {
		appRevisionID = request.AppRevisionID
		telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "app-revision-id", Value: request.AppRevisionID})
	} else {
		app, err := v2.AppFromProto(appProto)
		if err != nil {
			err := telemetry.Error(ctx, span, err, "error converting app proto to app")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}

		telemetry.WithAttributes(span,
			telemetry.AttributeKV{Key: "app-name", Value: appProto.Name},
			telemetry.AttributeKV{Key: "deployment-target-id", Value: request.DeploymentTargetId},
		)

		deploymentTargetDetails, err := deployment_target.DeploymentTargetDetails(ctx, deployment_target.DeploymentTargetDetailsInput{
			ProjectID:          int64(project.ID),
			ClusterID:          int64(cluster.ID),
			DeploymentTargetID: deploymentTargetID,
			CCPClient:          c.Config().ClusterControlPlaneClient,
		})
		if err != nil {
			err := telemetry.Error(ctx, span, err, "error getting deployment target details")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}

		agent, err := c.GetAgent(r, cluster, "")
		if err != nil {
			err := telemetry.Error(ctx, span, err, "error getting kubernetes agent")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}

		subdomainCreateInput := porter_app.CreatePorterSubdomainInput{
			AppName:             app.Name,
			RootDomain:          c.Config().ServerConf.AppRootDomain,
			DNSClient:           c.Config().DNSClient,
			DNSRecordRepository: c.Repo().DNSRecord(),
			KubernetesAgent:     agent,
		}

		appWithDomains, err := addPorterSubdomainsIfNecessary(ctx, app, deploymentTargetDetails, subdomainCreateInput)
		if err != nil {
			err := telemetry.Error(ctx, span, err, "error adding porter subdomains")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
			return
		}

		appProto, _, err = v2.ProtoFromApp(ctx, appWithDomains)
		if err != nil {
			err := telemetry.Error(ctx, span, err, "error converting app to proto")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}
	}

	if appProto.Name != "" && appProto.Name != appName {
		err := telemetry.Error(ctx, span, nil, "app proto name is empty")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	appProto.Name = appName

	var serviceDeletions map[string]*porterv1.ServiceDeletions
	if request.Deletions.ServiceDeletions != nil {
		serviceDeletions = make(map[string]*porterv1.ServiceDeletions)
		for k, v := range request.Deletions.ServiceDeletions {
			serviceDeletions[k] = &porterv1.ServiceDeletions{
				DomainNames:        v.DomainNames,
				IngressAnnotations: v.IngressAnnotationKeys,
			}
		}
	}

	updateReq := connect.NewRequest(&porterv1.UpdateAppRequest{
		ProjectId: int64(project.ID),
		DeploymentTargetIdentifier: &porterv1.DeploymentTargetIdentifier{
			Id: deploymentTargetID,
		},
		App:           appProto,
		AppRevisionId: appRevisionID,
		AppEnv: &porterv1.EnvGroupVariables{
			Normal: envVariables,
			Secret: request.Secrets,
		},
		Deletions: &porterv1.Deletions{
			ServiceNames:     request.Deletions.ServiceNames,
			PredeployNames:   request.Deletions.Predeploy,
			EnvVariableNames: request.Deletions.EnvVariableNames,
			EnvGroupNames:    request.Deletions.EnvGroupNames,
			ServiceDeletions: serviceDeletions,
		},
		AppOverrides:  overrides,
		CommitSha:     request.CommitSHA,
		IsEnvOverride: request.IsEnvOverride,
	})

	ccpResp, err := c.Config().ClusterControlPlaneClient.UpdateApp(ctx, updateReq)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error calling ccp update app")
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

	if ccpResp.Msg.AppRevisionId == "" {
		err := telemetry.Error(ctx, span, err, "ccp resp app revision id is empty")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "resp-app-revision-id", Value: ccpResp.Msg.AppRevisionId})

	if ccpResp.Msg.CliAction == porterv1.EnumCLIAction_ENUM_CLI_ACTION_UNSPECIFIED {
		err := telemetry.Error(ctx, span, err, "ccp resp cli action is nil")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "cli-action", Value: ccpResp.Msg.CliAction.String()})

	response := &UpdateAppResponse{
		AppRevisionId: ccpResp.Msg.AppRevisionId,
		CLIAction:     ccpResp.Msg.CliAction,
	}

	c.WriteResult(w, r, response)
}

func mergeEnvVariables(currentEnv, previousEnv map[string]string) map[string]string {
	env := make(map[string]string)

	for k, v := range previousEnv {
		env[k] = v
	}
	for k, v := range currentEnv {
		env[k] = v
	}

	return env
}
