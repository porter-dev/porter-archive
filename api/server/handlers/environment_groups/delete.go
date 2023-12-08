package environment_groups

import (
	"net/http"

	"connectrpc.com/connect"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/porter/internal/kubernetes/environment_groups"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
)

type DeleteEnvironmentGroupHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewDeleteEnvironmentGroupHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *DeleteEnvironmentGroupHandler {
	return &DeleteEnvironmentGroupHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

type DeleteEnvironmentGroupRequest struct {
	// Name of the env group to delete
	Name string `json:"name"`

	// Type of the env group to delete
	Type string `json:"type"`
}
type DeleteEnvironmentGroupResponse struct{}

func (c *DeleteEnvironmentGroupHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-delete-env-group")
	defer span.End()

	request := &DeleteEnvironmentGroupRequest{}
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
		_, err := c.Config().ClusterControlPlaneClient.DeleteEnvGroup(ctx, connect.NewRequest(&porterv1.DeleteEnvGroupRequest{
			ProjectId:            int64(cluster.ProjectID),
			ClusterId:            int64(cluster.ID),
			EnvGroupProviderType: porterv1.EnumEnvGroupProviderType_ENUM_ENV_GROUP_PROVIDER_TYPE_DOPPLER,
			EnvGroupName:         request.Name,
		}))
		if err != nil {
			err := telemetry.Error(ctx, span, err, "unable to create environment group")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}
	default:
		agent, err := c.GetAgent(r, cluster, "")
		if err != nil {
			err := telemetry.Error(ctx, span, err, "unable to connect to kubernetes cluster")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}

		err = environment_groups.DeleteEnvironmentGroup(ctx, agent, request.Name)
		if err != nil {
			err := telemetry.Error(ctx, span, err, "unable to delete environment group")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}
	}
}
