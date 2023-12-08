package environment_groups

import (
	"net/http"

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

// EnableExternalProvidersHandler is the handler for the /environment-groups/enable-external-providers endpoint
type EnableExternalProvidersHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

// NewEnableExternalProvidersHandler creates an instance of EnableExternalProvidersHandler
func NewEnableExternalProvidersHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *EnableExternalProvidersHandler {
	return &EnableExternalProvidersHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

// EnableExternalProvidersResponse is the response object for the /environment-groups/enable-external-providers endpoint
func (c *EnableExternalProvidersHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-enable-external-providers")
	defer span.End()

	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)

	_, err := c.Config().ClusterControlPlaneClient.EnableExternalEnvGroupProviders(ctx, connect.NewRequest(&porterv1.EnableExternalEnvGroupProvidersRequest{
		ProjectId: int64(cluster.ProjectID),
		ClusterId: int64(cluster.ID),
	}))
	if err != nil {
		err := telemetry.Error(ctx, span, err, "unable to enable external providers")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}
}
