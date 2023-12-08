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

type AreExternalProvidersEnabledHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

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

type AreExternalProvidersEnabledResponse struct {
	Enabled             bool `json:"enabled"`
	ReprovisionRequired bool `json:"reprovision_required"`
	K8SUpgradeRequired  bool `json:"k8s_upgrade_required"`
}

func (c *AreExternalProvidersEnabledHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-are-external-providers-enabled")
	defer span.End()

	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)

	resp, err := c.Config().ClusterControlPlaneClient.AreExternalEnvGroupProvidersEnabled(ctx, connect.NewRequest(&porterv1.AreExternalEnvGroupProvidersEnabledRequest{
		ProjectId: int64(cluster.ProjectID),
		ClusterId: int64(cluster.ID),
	}))
	if err != nil {
		err := telemetry.Error(ctx, span, err, "unable to enable external providers")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	c.WriteResult(w, r, &AreExternalProvidersEnabledResponse{
		Enabled:             resp.Msg.Enabled,
		ReprovisionRequired: resp.Msg.ReprovisionRequired,
		K8SUpgradeRequired:  resp.Msg.K8SUpgradeRequired,
	})
}
