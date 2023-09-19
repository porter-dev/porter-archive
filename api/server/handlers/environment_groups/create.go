package environment_groups

import (
	"net/http"
	"time"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/kubernetes/environment_groups"
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

type UpdateEnvironmentGroupRequest struct {
	// Name of the env group to create or update
	Name string `json:"name"`

	// Variables are values which are not sensitive. All values must be a string due to a kubernetes limitation.
	Variables map[string]string `json:"variables"`

	// SecretVariables are sensitive values. All values must be a string due to a kubernetes limitation.
	SecretVariables map[string]string `json:"secret_variables"`
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
	)

	agent, err := c.GetAgent(r, cluster, "")
	if err != nil {
		err := telemetry.Error(ctx, span, err, "unable to connect to kubernetes cluster")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	secrets := make(map[string][]byte)
	for k, v := range request.SecretVariables {
		secrets[k] = []byte(v)
	}

	envGroup := environment_groups.EnvironmentGroup{
		Name:            request.Name,
		Variables:       request.Variables,
		SecretVariables: secrets,
		CreatedAtUTC:    time.Now().UTC(),
	}

	err = environment_groups.CreateOrUpdateBaseEnvironmentGroup(ctx, agent, envGroup, nil)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "unable to create or update environment group")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	envGroupResponse := &UpdateEnvironmentGroupResponse{
		Name:      envGroup.Name,
		CreatedAt: envGroup.CreatedAtUTC,
	}
	c.WriteResult(w, r, envGroupResponse)

	// TODO: Syncing applications that are linked is currently done by the frontend. This should be done entirely
	// applicationsToSync, err := environment_groups.LinkedApplications(ctx, agent, envGroup.Name)
	// if err != nil {
	// 	err := telemetry.Error(ctx, span, err, "unable to find linked applications for environment group")
	// 	c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
	// 	return
	// }
	// for _, app := range applicationsToSync {
	// 	TODO: Call porter app update
	// }
}
