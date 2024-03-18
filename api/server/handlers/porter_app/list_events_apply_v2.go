package porter_app

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/internal/repository/gorm/helpers"

	"github.com/google/uuid"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
)

// PorterAppV2EventListHandler handles the /apps/{app_name}/events endpoint (used for validate_apply v2)
type PorterAppV2EventListHandler struct {
	handlers.PorterHandlerReadWriter
}

// ListPorterAppEventsRequest represents the accepted fields on a request to the /apps/{app_name}/events endpoint
type ListPorterAppEventsRequest struct {
	DeploymentTargetId string `schema:"deployment_target_id"`
	Page               int64  `schema:"page"`
}

// NewPorterAppV2EventListHandler returns a new PorterAppV2EventListHandler
func NewPorterAppV2EventListHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *PorterAppV2EventListHandler {
	return &PorterAppV2EventListHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (p *PorterAppV2EventListHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-list-porter-app-v2-events")
	defer span.End()

	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)

	appName, reqErr := requestutils.GetURLParamString(r, types.URLParamPorterAppName)
	if reqErr != nil {
		e := telemetry.Error(ctx, span, nil, "error parsing porter app name from url")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusBadRequest))
		return
	}
	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "porter-app-name", Value: appName},
	)

	request := &ListPorterAppEventsRequest{}
	if ok := p.DecodeAndValidate(w, r, request); !ok {
		err := telemetry.Error(ctx, span, nil, "invalid request")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "deployment-target-id", Value: request.DeploymentTargetId},
	)
	uid, err := uuid.Parse(request.DeploymentTargetId)
	if err != nil {
		e := telemetry.Error(ctx, span, nil, "error parsing deployment target id")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusBadRequest))
		return
	}

	appInstance, err := p.Repo().AppInstance().FromNameAndDeploymentTargetId(ctx, appName, uid.String())
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error retrieving porter app by name")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	revisions, paginatedResult, err := p.Repo().AppRevision().Revisions(cluster.ProjectID, appInstance.ID.String(), helpers.WithPageSize(20), helpers.WithPage(int(request.Page)))
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error retrieving app revisions")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	res := struct {
		Events []types.PorterAppEvent `json:"events"`
		types.PaginationResponse
	}{
		PaginationResponse: types.PaginationResponse(paginatedResult),
	}
	res.Events = make([]types.PorterAppEvent, 0)

	for _, revision := range revisions {
		if revision == nil {
			continue
		}
		by, err := revision.Metadata.Value()
		if err != nil {
			err = telemetry.Error(ctx, span, err, "error getting metadata value")
			p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}

		strMetadata, ok := by.(string)
		if !ok {
			err = telemetry.Error(ctx, span, nil, "error getting string metadata value")
			p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}

		fmt.Println(strMetadata)

		var events struct {
			Events []types.PorterAppEvent
		}

		err = json.Unmarshal([]byte(strMetadata), &events)
		if err != nil {
			err = telemetry.Error(ctx, span, err, "error unmarshalling metadata value")
			p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}

		for i := range events.Events {
			events.Events[i].DeploymentTargetID = request.DeploymentTargetId
			events.Events[i].PorterAppID = uint(revision.PorterAppID)
			events.Events[i].AppRevisionID = revision.ID.String()
		}

		res.Events = append(res.Events, events.Events...)
	}
	p.WriteResult(w, r, res)
}
