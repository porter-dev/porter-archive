package api_contract

import (
	"net/http"
	"strconv"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"github.com/porter-dev/porter/internal/telemetry"
)

// APIContractRevisionListHandler is the handler for the GET /api/projects/{project_id}/contracts endpoint
type APIContractRevisionListHandler struct {
	handlers.PorterHandlerReadWriter
}

// NewAPIContractRevisionListHandler returns a new APIContractRevisionListHandler
func NewAPIContractRevisionListHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *APIContractRevisionListHandler {
	return &APIContractRevisionListHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

// APIContractRevisionListRequest is the request schema for the APIContractRevisionListHandler
type APIContractRevisionListRequest struct {
	Latest    bool   `schema:"latest"`
	ClusterID string `schema:"cluster_id"`
}

// ServeHTTP returns a list of Porter API contract revisions for a given project.
// If clusterID is also given, it will list by project_id, cluster_id
// If latest is provided, it will only return the latest revision for each contract
func (c *APIContractRevisionListHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-api-contract-revisions")
	defer span.End()

	proj, _ := ctx.Value(types.ProjectScope).(*models.Project)

	request := &APIContractRevisionListRequest{}
	if ok := c.DecodeAndValidate(w, r, request); !ok {
		err := telemetry.Error(ctx, span, nil, "error decoding request")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	clusterID := 0
	clusterIDParam := request.ClusterID
	if clusterIDParam != "" {
		i, err := strconv.Atoi(clusterIDParam)
		if err != nil {
			err = telemetry.Error(ctx, span, err, "error parsing cluster id")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
			return
		}
		clusterID = i
	}
	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "cluster-id", Value: clusterID},
		telemetry.AttributeKV{Key: "latest", Value: request.Latest},
	)

	resp := []*models.APIContractRevision{}
	revisions, err := c.Config().Repo.APIContractRevisioner().List(ctx, proj.ID, repository.WithClusterID(uint(clusterID)), repository.WithLatest(request.Latest))
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error getting latest api contract revisions")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}
	resp = append(resp, revisions...)

	c.WriteResult(w, r, resp)
}
