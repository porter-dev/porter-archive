package porter_app

import (
	"net/http"

	"connectrpc.com/connect"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
)

// AppEnvVariablesHandler is the handler for the /apps/{porter_app_name}/env-variables endpoint
type AppEnvVariablesHandler struct {
	handlers.PorterHandlerReadWriter
}

// NewAppEnvVariablesHandler handles GET requests to /apps/{porter_app_name}/env-variables
func NewAppEnvVariablesHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *AppEnvVariablesHandler {
	return &AppEnvVariablesHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

// EnvVariables is a struct containing maps of the app's env variables and secrets
type EnvVariables struct {
	Variables map[string]string `json:"variables"`
	Secrets   map[string]string `json:"secrets"`
}

// AppEnvVariablesRequest is the request object for the /apps/{porter_app_name}/env-variables endpoint
type AppEnvVariablesRequest struct {
	DeploymentTargetID string `schema:"deployment_target_id"`
}

// AppEnvVariablesResponse is the response object for the /apps/{porter_app_name}/env-variables endpoint
type AppEnvVariablesResponse struct {
	EnvVariables EnvVariables `json:"env_variables"`
}

// ServeHTTP retrieves the app's env variables from CCP and writes them to the response
func (c *AppEnvVariablesHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-get-app-env-variables")
	defer span.End()

	project, _ := ctx.Value(types.ProjectScope).(*models.Project)
	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)

	appName, reqErr := requestutils.GetURLParamString(r, types.URLParamPorterAppName)
	if reqErr != nil {
		e := telemetry.Error(ctx, span, reqErr, "error parsing stack name from url")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusBadRequest))
		return
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "app-name", Value: appName})

	request := &LatestAppRevisionRequest{}
	if ok := c.DecodeAndValidate(w, r, request); !ok {
		err := telemetry.Error(ctx, span, nil, "error decoding request")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	// optional deployment target id - if not provided, use the cluster's default
	deploymentTargetID := request.DeploymentTargetID
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "deployment-target-id", Value: deploymentTargetID})

	var deploymentTargetIdentifer *porterv1.DeploymentTargetIdentifier
	if deploymentTargetID != "" {
		deploymentTargetIdentifer = &porterv1.DeploymentTargetIdentifier{
			Id: deploymentTargetID,
		}
	}

	appEnvVariablesReq := connect.NewRequest(&porterv1.AppEnvVariablesRequest{
		ProjectId:                  int64(project.ID),
		ClusterId:                  int64(cluster.ID),
		AppName:                    appName,
		DeploymentTargetIdentifier: deploymentTargetIdentifer,
	})

	ccpResp, err := c.Config().ClusterControlPlaneClient.AppEnvVariables(ctx, appEnvVariablesReq)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error getting app env variables from ccp")
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	if ccpResp == nil || ccpResp.Msg == nil {
		err := telemetry.Error(ctx, span, nil, "ccp returned nil response")
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}
	if ccpResp.Msg.EnvVariables == nil {
		err := telemetry.Error(ctx, span, nil, "no env variables returned")
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	envVars := EnvVariables{
		Variables: ccpResp.Msg.EnvVariables.Normal,
		Secrets:   ccpResp.Msg.EnvVariables.Secret,
	}

	// write the app to the response
	c.WriteResult(w, r, &AppEnvVariablesResponse{
		EnvVariables: envVars,
	})
}
