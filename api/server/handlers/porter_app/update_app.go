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
	DeploymentTargetId string            `json:"deployment_target_id"`
	AppRevisionID      string            `json:"app_revision_id"`
	Base64AppOverrides string            `json:"b64_app_overrides"`
	Base64AppProto     string            `json:"b64_app_proto"`
	Variables          map[string]string `json:"variables"`
	Secrets            map[string]string `json:"secrets"`
	CommitSHA          string            `json:"commit_sha"`
	Deletions          Deletions         `json:"deletions"`
	ForceBuild         bool              `json:"force_build"`
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

	var appRevisionID string
	var appProto *porterv1.PorterApp
	var deploymentTargetID string

	if request.AppRevisionID != "" {
		appRevisionID = request.AppRevisionID
		telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "app-revision-id", Value: request.AppRevisionID})
	} else {
		if request.Base64AppProto == "" {
			err := telemetry.Error(ctx, span, nil, "b64 yaml is empty")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
			return
		}

		decoded, err := base64.StdEncoding.DecodeString(request.Base64AppProto)
		if err != nil {
			err := telemetry.Error(ctx, span, err, "error decoding base yaml")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
			return
		}

		appProto = &porterv1.PorterApp{}
		err = helpers.UnmarshalContractObject(decoded, appProto)
		if err != nil {
			err := telemetry.Error(ctx, span, err, "error unmarshalling app proto")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
			return
		}

		app, err := v2.AppFromProto(appProto)
		if err != nil {
			err := telemetry.Error(ctx, span, err, "error converting app proto to app")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}

		if request.DeploymentTargetId == "" {
			err := telemetry.Error(ctx, span, err, "deployment target id is empty")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
			return
		}
		deploymentTargetID = request.DeploymentTargetId

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

	var overrides *porterv1.PorterApp
	if request.Base64AppOverrides != "" {
		decoded, err := base64.StdEncoding.DecodeString(request.Base64AppOverrides)
		if err != nil {
			err := telemetry.Error(ctx, span, err, "error decoding base  yaml")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
			return
		}

		overrides = &porterv1.PorterApp{}
		err = helpers.UnmarshalContractObject(decoded, overrides)
		if err != nil {
			err := telemetry.Error(ctx, span, err, "error unmarshalling app proto")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
			return
		}

		telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "validated-with-overrides", Value: true})
	}

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
		ProjectId:          int64(project.ID),
		DeploymentTargetId: deploymentTargetID,
		App:                appProto,
		AppRevisionId:      appRevisionID,
		AppEnv: &porterv1.EnvGroupVariables{
			Normal: request.Variables,
			Secret: request.Secrets,
		},
		Deletions: &porterv1.Deletions{
			ServiceNames:     request.Deletions.ServiceNames,
			PredeployNames:   request.Deletions.Predeploy,
			EnvVariableNames: request.Deletions.EnvVariableNames,
			EnvGroupNames:    request.Deletions.EnvGroupNames,
			ServiceDeletions: serviceDeletions,
		},
		AppOverrides:        overrides,
		CommitSha:           request.CommitSHA,
		IsEnvOverride:       request.IsEnvOverride,
		IsAwaitingPredeploy: request.IsAwaitingPredeploy,
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
