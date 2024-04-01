package environment_groups

import (
	"net/http"
	"time"

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

type UpdateEnvironmentGroupHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewUpdateEnvironmentGroupHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *UpdateEnvironmentGroupHandler {
	return &UpdateEnvironmentGroupHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

// EnvVariableDeletions is the set of keys to delete from the environment group
type EnvVariableDeletions struct {
	// Variables is a set of variable keys to delete from the environment group
	Variables []string `json:"variables"`
	// Secrets is a set of secret variable keys to delete from the environment group
	Secrets []string `json:"secrets"`
}

type UpdateEnvironmentGroupRequest struct {
	// Name of the env group to create or update
	Name string `json:"name"`

	// Type of the env group to create or update
	Type string `json:"type"`

	// AuthToken for the env group
	AuthToken string `json:"auth_token"`

	// Variables are values which are not sensitive. All values must be a string due to a kubernetes limitation.
	Variables map[string]string `json:"variables"`

	// SecretVariables are sensitive values. All values must be a string due to a kubernetes limitation.
	SecretVariables map[string]string `json:"secret_variables"`

	// IsEnvOverride is a flag to determine if provided variables should override or merge with existing variables
	IsEnvOverride bool `json:"is_env_override"`

	// Deletions is a set of keys to delete from the environment group
	Deletions EnvVariableDeletions `json:"deletions"`

	// SkipAppAutoDeploy is a flag to determine if the app should be auto deployed
	SkipAppAutoDeploy bool `json:"skip_app_auto_deploy"`
}
type UpdateEnvironmentGroupResponse struct {
	// Name of the env group to create or update
	Name string `json:"name"`

	// Variables are variables which should are not sensitive. All values must be a string due to a kubernetes limitation.
	Variables map[string]string `json:"variables,omitempty"`

	// SecretVariables are sensitive variables. All values must be a string due to a kubernetes limitation.
	SecretVariables map[string]string `json:"secret_variables,omitempty"`

	CreatedAt time.Time `json:"created_at"`
}

func (c *UpdateEnvironmentGroupHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-update-env-group")
	defer span.End()

	request := &UpdateEnvironmentGroupRequest{}
	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}
	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "environment-group-name", Value: request.Name},
		telemetry.AttributeKV{Key: "environment-group-type", Value: request.Type},
	)

	switch request.Type {
	case "doppler":
		_, err := c.Config().ClusterControlPlaneClient.CreateOrUpdateEnvGroup(ctx, connect.NewRequest(&porterv1.CreateOrUpdateEnvGroupRequest{
			ProjectId:            int64(cluster.ProjectID),
			ClusterId:            int64(cluster.ID),
			EnvGroupProviderType: porterv1.EnumEnvGroupProviderType_ENUM_ENV_GROUP_PROVIDER_TYPE_DOPPLER,
			EnvGroupName:         request.Name,
			EnvGroupAuthToken:    request.AuthToken,
		}))
		if err != nil {
			err := telemetry.Error(ctx, span, err, "unable to create environment group")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}

	default:
		_, err := c.Config().ClusterControlPlaneClient.CreateOrUpdateEnvGroup(ctx, connect.NewRequest(&porterv1.CreateOrUpdateEnvGroupRequest{
			ProjectId:            int64(cluster.ProjectID),
			ClusterId:            int64(cluster.ID),
			EnvGroupProviderType: porterv1.EnumEnvGroupProviderType_ENUM_ENV_GROUP_PROVIDER_TYPE_PORTER,
			EnvGroupName:         request.Name,
			EnvVars: &porterv1.EnvGroupVariables{
				Normal: request.Variables,
				Secret: request.SecretVariables,
			},
			EnvVariableDeletions: &porterv1.EnvVariableDeletions{
				Variables: request.Deletions.Variables,
				Secrets:   request.Deletions.Secrets,
			},
			IsEnvOverride:     request.IsEnvOverride,
			SkipAppAutoDeploy: request.SkipAppAutoDeploy,
		}))
		if err != nil {
			err := telemetry.Error(ctx, span, err, "unable to create environment group")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}
	}

	envGroupResponse := &UpdateEnvironmentGroupResponse{
		Name:      request.Name,
		CreatedAt: time.Now().UTC(),
	}
	c.WriteResult(w, r, envGroupResponse)
}
