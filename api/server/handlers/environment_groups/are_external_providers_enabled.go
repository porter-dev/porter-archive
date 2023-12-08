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

// AreExternalProvidersEnabledHandler is the handler for the /environment-group/are-external-providers-enabled endpoint
type AreExternalProvidersEnabledHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

// NewAreExternalProvidersEnabledHandler creates an instance of AreExternalProvidersEnabledHandler
func NewAreExternalProvidersEnabledHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *AreExternalProvidersEnabledHandler {
	return &AreExternalProvidersEnabledHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

// AreExternalProvidersEnabledResponse is the response object for the /environment-group/are-external-providers-enabled endpoint
type AreExternalProvidersEnabledResponse struct {
	// Enabled is true if external providers are enabled
	Enabled bool `json:"enabled"`
	// ReprovisionRequired is true if the cluster needs to be reprovisioned to enable external providers
	ReprovisionRequired bool `json:"reprovision_required"`
	// K8SUpgradeRequired is true if the cluster needs to be upgraded to v1.27 to enable external providers
	K8SUpgradeRequired bool `json:"k8s_upgrade_required"`
}

// ServeHTTP checks if external providers are enabled
func (c *AreExternalProvidersEnabledHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-are-external-providers-enabled")
	defer span.End()

	project, _ := ctx.Value(types.ProjectScope).(*models.Project)
	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)

	resp, err := c.Config().ClusterControlPlaneClient.AreExternalEnvGroupProvidersEnabled(ctx, connect.NewRequest(&porterv1.AreExternalEnvGroupProvidersEnabledRequest{
		ProjectId: int64(project.ID),
		ClusterId: int64(cluster.ID),
	}))
	if err != nil {
		err := telemetry.Error(ctx, span, err, "unable to check if external providers are enabled")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	c.WriteResult(w, r, &AreExternalProvidersEnabledResponse{
		Enabled:             resp.Msg.Enabled,
		ReprovisionRequired: resp.Msg.ReprovisionRequired,
		K8SUpgradeRequired:  resp.Msg.K8SUpgradeRequired,
	})
}
