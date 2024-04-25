// NewGetUsageDashboardHandler returns a new GetUsageDashboardHandler
package billing

import (
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
)

// IngestEventsHandler is a handler for ingesting billing events
type IngestEventsHandler struct {
	handlers.PorterHandlerReadWriter
}

// NewIngestEventsHandler returns a new IngestEventsHandler
func NewIngestEventsHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *IngestEventsHandler {
	return &IngestEventsHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *IngestEventsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-ingest-events")
	defer span.End()

	proj, _ := ctx.Value(types.ProjectScope).(*models.Project)

	if !c.Config().BillingManager.MetronomeConfigLoaded || !proj.GetFeatureFlag(models.MetronomeEnabled, c.Config().LaunchDarklyClient) {
		c.WriteResult(w, r, "")

		telemetry.WithAttributes(span,
			telemetry.AttributeKV{Key: "metronome-config-exists", Value: c.Config().BillingManager.MetronomeConfigLoaded},
			telemetry.AttributeKV{Key: "metronome-enabled", Value: proj.GetFeatureFlag(models.MetronomeEnabled, c.Config().LaunchDarklyClient)},
			telemetry.AttributeKV{Key: "porter-cloud-enabled", Value: proj.EnableSandbox},
		)
		return
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "metronome-enabled", Value: true},
		telemetry.AttributeKV{Key: "usage-id", Value: proj.UsageID},
	)

	ingestEventsRequest := struct {
		Events []types.BillingEvent `json:"billing_events"`
	}{}

	if ok := c.DecodeAndValidate(w, r, &ingestEventsRequest); !ok {
		err := telemetry.Error(ctx, span, nil, "error decoding ingest events request")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "usage-events-count", Value: len(ingestEventsRequest.Events)},
	)

	// For Porter Cloud events, we apend a prefix to avoid collisions before sending to Metronome
	if proj.EnableSandbox {
		for i := range ingestEventsRequest.Events {
			ingestEventsRequest.Events[i].CustomerID = fmt.Sprintf("porter-cloud-%s", ingestEventsRequest.Events[i].CustomerID)
		}
	}

	err := c.Config().BillingManager.MetronomeClient.IngestEvents(ctx, ingestEventsRequest.Events)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error ingesting events")
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	c.WriteResult(w, r, "")
}
