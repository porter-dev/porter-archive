package porter_app

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/porter-dev/porter/internal/kubernetes/environment_groups"
	"github.com/porter-dev/porter/internal/repository"

	"github.com/porter-dev/porter/api/server/shared/requestutils"

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

// UpdateAppEnvironmentGroupHandler handles the /apps/{porter_app_name}/update-environment-group endpoint
type UpdateAppEnvironmentGroupHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

// NewUpdateAppEnvironmentGroupHandler returns a new UpdateAppEnvironmentGroupHandler
func NewUpdateAppEnvironmentGroupHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *UpdateAppEnvironmentGroupHandler {
	return &UpdateAppEnvironmentGroupHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

// UpdateAppEnvironmentGroupRequest represents the accepted fields on a request to the /apps/{porter_app_name}/environment-group endpoint
type UpdateAppEnvironmentGroupRequest struct {
	DeploymentTargetID string            `schema:"deployment_target_id"`
	Variables          map[string]string `schema:"variables"`
	Secrets            map[string]string `schema:"secrets"`
	// HardUpdate is used to remove any variables that are not specified in the request.  If false, the request will only update the variables specified in the request,
	// and leave all other variables untouched.
	HardUpdate bool `schema:"remove_missing"`
}

// UpdateAppEnvironmentGroupResponse represents the fields on the response object from the /apps/{porter_app_name}/environment-group endpoint
type UpdateAppEnvironmentGroupResponse struct {
	EnvGroupName    string `schema:"env_group_name"`
	EnvGroupVersion int    `schema:"env_group_version"`
}

// ServeHTTP updates or creates the environment group for an app
func (c *UpdateAppEnvironmentGroupHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
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

	request := &UpdateAppEnvironmentGroupRequest{}
	if ok := c.DecodeAndValidate(w, r, request); !ok {
		err := telemetry.Error(ctx, span, nil, "invalid request")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

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

	envGroupName, err := AppEnvGroupName(ctx, appName, request.DeploymentTargetID, cluster.ID, c.Repo().PorterApp())
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

	secrets := make(map[string][]byte)
	for k, v := range request.Secrets {
		secrets[k] = []byte(v)
	}

	envGroup := environment_groups.EnvironmentGroup{
		Name:            envGroupName,
		Variables:       request.Variables,
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

	res := &UpdateAppEnvironmentGroupResponse{
		EnvGroupName:    split[0],
		EnvGroupVersion: version,
	}

	c.WriteResult(w, r, res)
}

func AppEnvGroupName(ctx context.Context, appName string, deploymentTargetId string, clusterID uint, porterAppRepository repository.PorterAppRepository) (string, error) {
	ctx, span := telemetry.NewSpan(ctx, "app-env-group-name")
	defer span.End()

	if appName == "" {
		return "", telemetry.Error(ctx, span, nil, "app name is empty")
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "app-name", Value: appName})

	if deploymentTargetId == "" {
		return "", telemetry.Error(ctx, span, nil, "deployment target id is empty")
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "deployment-target-id", Value: deploymentTargetId})

	if clusterID == 0 {
		return "", telemetry.Error(ctx, span, nil, "cluster id is empty")
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "cluster-id", Value: clusterID})

	porterApp, err := porterAppRepository.ReadPorterAppByName(clusterID, appName)
	if err != nil {
		return "", telemetry.Error(ctx, span, err, "error reading porter app by name")
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "porter-app-id", Value: porterApp.ID})

	if len(deploymentTargetId) < 6 {
		return "", telemetry.Error(ctx, span, nil, "deployment target id is too short")
	}

	return fmt.Sprintf("%d-%s", porterApp.ID, deploymentTargetId[:6]), nil
}
