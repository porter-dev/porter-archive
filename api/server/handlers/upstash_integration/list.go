package upstash_integration

import (
	"net/http"
	"time"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
)

// ListUpstashIntegrationsHandler is a struct for listing all upstash integrations for a given project
type ListUpstashIntegrationsHandler struct {
	handlers.PorterHandlerReadWriter
}

// NewListUpstashIntegrationsHandler constructs a ListUpstashIntegrationsHandler
func NewListUpstashIntegrationsHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *ListUpstashIntegrationsHandler {
	return &ListUpstashIntegrationsHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

// UpstashIntegration describes a upstash integration
type UpstashIntegration struct {
	CreatedAt time.Time `json:"created_at"`
}

// ListUpstashIntegrationsResponse describes the list upstash integrations response body
type ListUpstashIntegrationsResponse struct {
	// Integrations is a list of upstash integrations
	Integrations []UpstashIntegration `json:"integrations"`
}

// ServeHTTP returns a list of upstash integrations associated with the specified project
func (h *ListUpstashIntegrationsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-list-upstash-integrations")
	defer span.End()

	project, _ := ctx.Value(types.ProjectScope).(*models.Project)

	resp := ListUpstashIntegrationsResponse{}
	integrationList := make([]UpstashIntegration, 0)

	integrations, err := h.Repo().UpstashIntegration().Integrations(ctx, project.ID)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error getting datastores")
		h.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	for _, int := range integrations {
		integrationList = append(integrationList, UpstashIntegration{
			CreatedAt: int.CreatedAt,
		})
	}

	resp.Integrations = integrationList

	h.WriteResult(w, r, resp)
}
