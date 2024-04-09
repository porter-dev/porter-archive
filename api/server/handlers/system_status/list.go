package systemstatus

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type SystemServicesListHandler struct {
	handlers.PorterHandlerWriter
}

func NewSystemServiceListHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *SystemServicesListHandler {
	return &SystemServicesListHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (p *SystemServicesListHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// read the project and cluster from context
	project, _ := r.Context().Value(types.ProjectScope).(*models.Project)
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)
	p.Config().ClusterControlPlaneClient.
}
