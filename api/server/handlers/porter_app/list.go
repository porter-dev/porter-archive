package porter_app

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
)

type PorterAppListHandler struct {
	handlers.PorterHandlerWriter
}

func NewPorterAppListHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *PorterAppListHandler {
	return &PorterAppListHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (p *PorterAppListHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-list-porter-apps")
	defer span.End()

	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)

	porterApps, err := p.Repo().PorterApp().ListPorterAppByClusterID(cluster.ID, 0)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "Failed to list porter apps")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	res := make(types.ListPorterAppResponse, 0)

	for _, porterApp := range porterApps {
		res = append(res, porterApp.ToPorterAppType())
	}

	p.WriteResult(w, r, res)
}
