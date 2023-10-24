package porter_app

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
)

// UseNewApplyLogicHandler returns whether the CLI should use the new apply logic or not
type UseNewApplyLogicHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

// NewUseNewApplyLogicHandler returns a new UseNewApplyLogicHandler
func NewUseNewApplyLogicHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *UseNewApplyLogicHandler {
	return &UseNewApplyLogicHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

// UseNewApplyLogicRequest is the request body for the /apps/use-new-apply-logic endpoint
type UseNewApplyLogicRequest struct{}

// UseNewApplyLogicResponse is the response body for the /apps/use-new-apply-logic endpoint
type UseNewApplyLogicResponse struct {
	UseNewApplyLogic bool `json:"use_new_apply_logic"`
}

// ServeHTTP handles the request on the /apps/use-new-apply-logic endpoint, allowing the server to tell the CLI whether to use the new apply logic or not
func (c *UseNewApplyLogicHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-use-new-apply-logic")
	defer span.End()

	project, _ := ctx.Value(types.ProjectScope).(*models.Project)
	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "project_id", Value: project.ID},
		telemetry.AttributeKV{Key: "cluster_id", Value: cluster.ID},
	)

	c.WriteResult(w, r, &UseNewApplyLogicResponse{
		UseNewApplyLogic: false,
	})
}
