package api_contract

import (
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type APIContractRevisionListHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewAPIContractRevisionListHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *APIContractRevisionListHandler {
	return &APIContractRevisionListHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

// ServeHTTP returns a list of Porter API contract revisions for a given project.
// If clusterID is also given, it will list by project_id, cluster_id
func (c *APIContractRevisionListHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)
	cluster, _ := r.Context().Value(types.ProjectScope).(*models.Cluster)

	ctx := r.Context()

	revisions, err := c.Config().Repo.APIContractRevisioner().List(ctx, proj.ID, cluster.ID)
	if err != nil {
		e := fmt.Errorf("error creating new capi config: %w", err)
		c.HandleAPIError(w, r, apierrors.NewErrInternal(e))
		return
	}

	w.WriteHeader(http.StatusCreated)
	c.WriteResult(w, r, revisions)
}
