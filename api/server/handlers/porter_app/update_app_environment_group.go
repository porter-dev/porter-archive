package porter_app

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/porter-dev/porter/internal/porter_app"

	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/internal/kubernetes/environment_groups"

	"connectrpc.com/connect"

	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
)

// UpdateAppEnvironmentHandler handles the /apps/{porter_app_name}/update-environment endpoint
type UpdateAppEnvironmentHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

// NewUpdateAppEnvironmentHandler returns a new UpdateAppEnvironmentHandler
func NewUpdateAppEnvironmentHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *UpdateAppEnvironmentHandler {
	return &UpdateAppEnvironmentHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

// UpdateAppEnvironmentRequest represents the accepted fields on a request to the /apps/{porter_app_name}/environment-group endpoint
type UpdateAppEnvironmentRequest struct {
	DeploymentTargetID string            `json:"deployment_target_id"`
	Variables          map[string]string `json:"variables"`
	Secrets            map[string]string `json:"secrets"`
	// HardUpdate is used to remove any variables that are not specified in the request.  If false, the request will only update the variables specified in the request,
	// and leave all other variables untouched.
	HardUpdate bool `json:"remove_missing"`
}

// UpdateAppEnvironmentResponse represents the fields on the response object from the /apps/{porter_app_name}/environment-group endpoint
type UpdateAppEnvironmentResponse struct {
	EnvGroupName    string `schema:"env_group_name"`
	EnvGroupVersion int    `schema:"env_group_version"`
}

// ServeHTTP updates or creates the environment group for an app
func (c *UpdateAppEnvironmentHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-update-app-env-group")
	defer span.End()
	r = r.Clone(ctx)
	project, _ := ctx.Value(types.ProjectScope).(*models.Project)
	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)

	appName, reqErr := requestutils.GetURLParamString(r, types.URLParamPorterAppName)
	if reqErr != nil {
		err := telemetry.Error(ctx, span, nil, "error parsing porter app name")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "app-name", Value: appName})

	request := &UpdateAppEnvironmentRequest{}
	if ok := c.DecodeAndValidate(w, r, request); !ok {
		err := telemetry.Error(ctx, span, nil, "invalid request")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	fmt.Println("Request:", request)

	if request.DeploymentTargetID == "" {
		err := telemetry.Error(ctx, span, nil, "must provide deployment target id")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "deployment-target-id", Value: request.DeploymentTargetID})

	deploymentTargetDetailsReq := connect.NewRequest(&porterv1.DeploymentTargetDetailsRequest{
		ProjectId:          int64(project.ID),
		DeploymentTargetId: request.DeploymentTargetID,
	})

	deploymentTargetDetailsResp, err := c.Config().ClusterControlPlaneClient.DeploymentTargetDetails(ctx, deploymentTargetDetailsReq)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error getting deployment target details from cluster control plane client")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	if deploymentTargetDetailsResp == nil || deploymentTargetDetailsResp.Msg == nil {
		err := telemetry.Error(ctx, span, err, "deployment target details resp is nil")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	if deploymentTargetDetailsResp.Msg.ClusterId != int64(cluster.ID) {
		err := telemetry.Error(ctx, span, err, "deployment target details resp cluster id does not match cluster id")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	namespace := deploymentTargetDetailsResp.Msg.Namespace
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "namespace", Value: namespace})

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "hard-update", Value: request.HardUpdate})

	envGroupName, err := porter_app.AppEnvGroupName(ctx, appName, request.DeploymentTargetID, cluster.ID, c.Repo().PorterApp())
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error getting app env group name")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	agent, err := c.GetAgent(r, cluster, "")
	if err != nil {
		err := telemetry.Error(ctx, span, err, "unable to connect to kubernetes cluster")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	latestEnvironmentGroup, err := environment_groups.LatestBaseEnvironmentGroup(ctx, agent, envGroupName)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "unable to get latest base environment group")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "env-group-exists", Value: latestEnvironmentGroup.Name != ""})

	if latestEnvironmentGroup.Name != "" {
		sameEnvGroup := true
		for key, newValue := range request.Variables {
			if existingValue, ok := latestEnvironmentGroup.Variables[key]; !ok || existingValue != newValue {
				sameEnvGroup = false
			}
		}
		for key, newValue := range request.Secrets {
			if existingValue, ok := latestEnvironmentGroup.SecretVariables[key]; !ok || string(existingValue) != newValue {
				sameEnvGroup = false
			}
		}
		if request.HardUpdate {
			for key, existingValue := range latestEnvironmentGroup.Variables {
				if newValue, ok := request.Variables[key]; !ok || existingValue != newValue {
					sameEnvGroup = false
				}
			}
			for key, existingValue := range latestEnvironmentGroup.SecretVariables {
				if newValue, ok := request.Secrets[key]; !ok || string(existingValue) != newValue {
					sameEnvGroup = false
				}
			}
		}
		telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "same-env-group", Value: sameEnvGroup})

		if sameEnvGroup {
			res := &UpdateAppEnvironmentResponse{
				EnvGroupName:    latestEnvironmentGroup.Name,
				EnvGroupVersion: latestEnvironmentGroup.Version,
			}

			c.WriteResult(w, r, res)
			return
		}
	}

	variables := make(map[string]string)
	secrets := make(map[string][]byte)

	if !request.HardUpdate {
		for key, value := range latestEnvironmentGroup.Variables {
			variables[key] = value
		}
		for key, value := range latestEnvironmentGroup.SecretVariables {
			secrets[key] = value
		}
	}

	for key, value := range request.Variables {
		variables[key] = value
	}
	for key, value := range request.Secrets {
		secrets[key] = []byte(value)
	}

	envGroup := environment_groups.EnvironmentGroup{
		Name:            envGroupName,
		Variables:       variables,
		SecretVariables: secrets,
		CreatedAtUTC:    time.Now().UTC(),
	}

	err = environment_groups.CreateOrUpdateBaseEnvironmentGroup(ctx, agent, envGroup)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "unable to create or update base environment group")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	inp := environment_groups.SyncLatestVersionToNamespaceInput{
		BaseEnvironmentGroupName: envGroupName,
		TargetNamespace:          namespace,
	}

	syncedEnvironment, err := environment_groups.SyncLatestVersionToNamespace(ctx, agent, inp)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "unable to create or update synced environment group")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "env-group-versioned-name", Value: syncedEnvironment.EnvironmentGroupVersionedName})

	split := strings.Split(syncedEnvironment.EnvironmentGroupVersionedName, ".")
	if len(split) != 2 {
		err := telemetry.Error(ctx, span, err, "unexpected environment group versioned name")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	version, err := strconv.Atoi(split[1])
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error converting environment group version to int")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	res := &UpdateAppEnvironmentResponse{
		EnvGroupName:    split[0],
		EnvGroupVersion: version,
	}

	c.WriteResult(w, r, res)
}
