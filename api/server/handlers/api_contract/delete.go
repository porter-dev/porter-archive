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

type APIContractRevisionDeleteHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewAPIContractRevisionDeleteHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *APIContractRevisionDeleteHandler {
	return &APIContractRevisionDeleteHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

// ServeHTTP returns deletes a given project and cluster's contract revision
func (c *APIContractRevisionDeleteHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)
	revision, _ := r.Context().Value(types.APIContractRevisionScope).(*models.APIContractRevision)

	ctx := r.Context()

	err := c.Config().Repo.APIContractRevisioner().Delete(ctx, proj.ID, 0, revision.ID)
	if err != nil {
		e := fmt.Errorf("error delete api contract revision: %w", err)
		c.HandleAPIError(w, r, apierrors.NewErrInternal(e))
		return
	}

	w.WriteHeader(http.StatusOK)
}
