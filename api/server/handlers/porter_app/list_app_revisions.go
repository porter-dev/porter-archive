package porter_app

import (
	"encoding/base64"
	"net/http"

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

// ListAppRevisionsHandler handles requests to the /apps/{porter_app_name}/revisions endpoint
type ListAppRevisionsHandler struct {
	handlers.PorterHandlerReadWriter
}

// NewListAppRevisionsHandler returns a new ListAppRevisionsHandler
func NewListAppRevisionsHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *ListAppRevisionsHandler {
	return &ListAppRevisionsHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

// ListAppRevisionsResponse represents the response from the /apps/{porter_app_name}/revisions endpoint
type ListAppRevisionsRequest struct {
	// The deployment target ID for the revisions
	DeploymentTargetID string `schema:"deployment_target_id"`
}

// RevisionData represents the data for a single revision
type RevisionData struct {
	// B64AppProto is the base64 encoded app proto definition
	B64AppProto string `json:"b64_app_proto"`
	// Status is the status of the revision
	Status string `json:"status"`
	// RevisionNumber is the revision number with respect to the app and deployment target
	RevisionNumber int `json:"revision_number"`
	// UpdatedAt is the time the revision was updated
	UpdatedAt string `json:"updated_at"`
}

// ListAppRevisionsResponse represents the response from the /apps/{porter_app_name}/revisions endpoint
type ListAppRevisionsResponse struct {
	Revisions []RevisionData `json:"revisions"`
}

func (c *ListAppRevisionsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-list-app-revisions")
	defer span.End()

	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	// get the app
	appName, reqErr := requestutils.GetURLParamString(r, types.URLParamPorterAppName)
	if reqErr != nil {
		err := telemetry.Error(ctx, span, nil, "error parsing porter app name")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "application-name", Value: appName})

	app, err := c.Repo().PorterApp().ReadPorterAppByName(cluster.ID, appName)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error reading porter app by name")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}
	if app.ID == 0 {
		err = telemetry.Error(ctx, span, nil, "app with name does not exist in project")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	// get the request object
	request := &ListAppRevisionsRequest{}
	if ok := c.DecodeAndValidate(w, r, request); !ok {
		err := telemetry.Error(ctx, span, nil, "error decoding request")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	// get the deployment target ID
	deploymentTargetID, err := uuid.Parse(request.DeploymentTargetID)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "invalid deployment target ID")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "deployment-target-id", Value: deploymentTargetID.String()})

	// get the app revisions
	revisions, err := c.Repo().AppRevision().AppRevisionsByAppAndDeploymentTarget(app.ID, deploymentTargetID)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error querying for app revisions")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	// create the response object
	res := &ListAppRevisionsResponse{
		Revisions: make([]RevisionData, 0),
	}

	// iterate through the revisions and add them to the response
	for _, revision := range revisions {
		b64 := base64.StdEncoding.EncodeToString([]byte(revision.Base64App))

		res.Revisions = append(res.Revisions, RevisionData{
			B64AppProto:    b64,
			Status:         revision.Status,
			RevisionNumber: revision.RevisionNumber,
			UpdatedAt:      revision.UpdatedAt.UTC().String(),
		})
	}

	c.WriteResult(w, r, res)
}
