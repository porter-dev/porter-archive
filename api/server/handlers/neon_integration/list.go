package neon_integration

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

// ListNeonIntegrationsHandler is a struct for listing all noen integrations for a given project
type ListNeonIntegrationsHandler struct {
	handlers.PorterHandlerReadWriter
}

// NewListNeonIntegrationsHandler constructs a ListNeonIntegrationsHandler
func NewListNeonIntegrationsHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *ListNeonIntegrationsHandler {
	return &ListNeonIntegrationsHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

type NeonIntegration struct {
	CreatedAt time.Time `json:"created_at"`
}

// ListNeonIntegrationsResponse describes the list neon integrations response body
type ListNeonIntegrationsResponse struct {
	// Integrations is a list of neon integrations
	Integrations []NeonIntegration `json:"integrations"`
}

// ServeHTTP returns a list of neon integrations associated with the specified project
func (h *ListNeonIntegrationsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-list-neon-integrations")
	defer span.End()

	project, _ := ctx.Value(types.ProjectScope).(*models.Project)

	resp := ListNeonIntegrationsResponse{}
	integrationList := make([]NeonIntegration, 0)

	integrations, err := h.Repo().NeonIntegration().Integrations(ctx, project.ID)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error getting datastores")
		h.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	for _, int := range integrations {
		integrationList = append(integrationList, NeonIntegration{
			CreatedAt: int.CreatedAt,
		})
	}

	resp.Integrations = integrationList

	h.WriteResult(w, r, resp)
}
