package porter_app

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/internal/repository/gorm/helpers"

	"connectrpc.com/connect"
	"github.com/google/uuid"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/porter_app"
	"github.com/porter-dev/porter/internal/telemetry"
)

// RevisionsHandler handles requests to the targets/{deployment_target_identifier}/apps/{porter_app_name}/revisions endpoint
type RevisionsHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

// NewRevisionsHandler returns a new RevisionsHandler
func NewRevisionsHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *RevisionsHandler {
	return &RevisionsHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

// RevisionsRequest represents the response from the /apps/{porter_app_name}/revisions endpoint
type RevisionsRequest struct {
	types.PaginationRequest
}

// RevisionsResponse represents the response from the /apps/{porter_app_name}/revisions endpoint
type RevisionsResponse struct {
	AppRevisionsWithEvents []AppRevisionWithEvents `json:"app_revisions_with_events"`
	types.PaginationResponse
}

type AppRevisionWithEvents struct {
	Revision porter_app.Revision `json:"revision"`
	Events   []Event             `json:"events"`
}

type Event struct {
	Type      string `json:"type"`
	Status    string `json:"status"`
	StartedAt string `json:"started_at"`
	EndedAt   string `json:"ended_at"`
}

func (c *RevisionsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-revisions")
	defer span.End()

	deploymentTarget, ok := ctx.Value(types.DeploymentTargetScope).(types.DeploymentTarget)
	if !ok {
		err := telemetry.Error(ctx, span, nil, "deployment target not found")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	appName, reqErr := requestutils.GetURLParamString(r, types.URLParamPorterAppName)
	if reqErr != nil {
		err := telemetry.Error(ctx, span, nil, "error parsing porter app name")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "application-name", Value: appName})

	request := &RevisionsRequest{}
	if ok := c.DecodeAndValidate(w, r, request); !ok {
		err := telemetry.Error(ctx, span, nil, "invalid request")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	appInstance, err := c.Repo().AppInstance().FromNameAndDeploymentTargetId(ctx, appName, deploymentTarget.ID.String())
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error retrieving porter app by name")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	revisions, paginatedResult, err := c.Repo().AppRevision().Revisions(deploymentTarget.ProjectID, appInstance.ID.String(), helpers.WithPageSize(20), helpers.WithPage(int(request.Page)))
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error retrieving app revisions")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	var resp RevisionsResponse

	for _, revision := range revisions {
		var appRevisionWith
		if revision == nil {
			continue
		}
		by, err := revision.Metadata.Value()
		if err != nil {
			err = telemetry.Error(ctx, span, err, "error getting metadata value")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}

		strMetadata, ok := by.(string)
		if !ok {
			err = telemetry.Error(ctx, span, nil, "error getting string metadata value")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}

		var events struct {
			Events []types.PorterAppEvent
		}

		err = json.Unmarshal([]byte(strMetadata), &events)
		if err != nil {
			err = telemetry.Error(ctx, span, err, "error unmarshalling metadata value")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}

		for i := range events.Events {
			events.Events[i].DeploymentTargetID = request.DeploymentTargetId
			events.Events[i].PorterAppID = uint(revision.PorterAppID)
			events.Events[i].AppRevisionID = revision.ID.String()
		}

		res.Events = append(res.Events, events.Events...)
	}

	c.WriteResult(w, r, res)
}
