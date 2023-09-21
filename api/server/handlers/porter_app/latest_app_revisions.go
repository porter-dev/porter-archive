package porter_app

import (
	"net/http"

	"connectrpc.com/connect"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/porter_app"
	"github.com/porter-dev/porter/internal/telemetry"
)

// LatestAppRevisionsHandler handles requests to the /apps/revisions endpoint
type LatestAppRevisionsHandler struct {
	handlers.PorterHandlerReadWriter
}

// NewLatestAppRevisionsHandler returns a new LatestAppRevisionsHandler
func NewLatestAppRevisionsHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *LatestAppRevisionsHandler {
	return &LatestAppRevisionsHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

// LatestAppRevisionsRequest represents the response from the /apps/revisions endpoint
type LatestAppRevisionsRequest struct{}

// LatestRevisionWithSource is an app revision and its source porter app
type LatestRevisionWithSource struct {
	AppRevision porter_app.Revision `json:"app_revision"`
	Source      types.PorterApp     `json:"source"`
}

// LatestAppRevisionsResponse represents the response from the /apps/revisions endpoint
type LatestAppRevisionsResponse struct {
	AppRevisions []LatestRevisionWithSource `json:"app_revisions"`
}

func (c *LatestAppRevisionsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-list-app-revisions")
	defer span.End()

	project, _ := r.Context().Value(types.ProjectScope).(*models.Project)
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	deploymentTargets, err := c.Repo().DeploymentTarget().List(project.ID)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error reading deployment targets")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	if len(deploymentTargets) == 0 {
		res := &LatestAppRevisionsResponse{
			AppRevisions: []LatestRevisionWithSource{},
		}

		c.WriteResult(w, r, res)
		return
	}

	if len(deploymentTargets) > 1 {
		err = telemetry.Error(ctx, span, err, "more than one deployment target found")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	// todo(ianedwards): once we have a way to select a deployment target, we can add it to the request
	deploymentTarget := deploymentTargets[0]

	listAppRevisionsReq := connect.NewRequest(&porterv1.LatestAppRevisionsRequest{
		ProjectId:          int64(project.ID),
		DeploymentTargetId: deploymentTarget.ID.String(),
	})

	latestAppRevisionsResp, err := c.Config().ClusterControlPlaneClient.LatestAppRevisions(ctx, listAppRevisionsReq)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error getting latest app revisions")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	if latestAppRevisionsResp == nil || latestAppRevisionsResp.Msg == nil {
		err = telemetry.Error(ctx, span, nil, "latest app revisions response is nil")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	appRevisions := latestAppRevisionsResp.Msg.AppRevisions
	if appRevisions == nil {
		appRevisions = []*porterv1.AppRevision{}
	}

	res := &LatestAppRevisionsResponse{
		AppRevisions: make([]LatestRevisionWithSource, 0),
	}

	for _, revision := range appRevisions {
		encodedRevision, err := porter_app.EncodedRevisionFromProto(ctx, revision)
		if err != nil {
			err := telemetry.Error(ctx, span, err, "error getting encoded revision from proto")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}

		porterApp, err := c.Repo().PorterApp().ReadPorterAppByName(cluster.ID, revision.App.Name)
		if err != nil {
			err := telemetry.Error(ctx, span, err, "error reading porter app")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}
		if porterApp == nil {
			err := telemetry.Error(ctx, span, err, "porter app is nil")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}

		res.AppRevisions = append(res.AppRevisions, LatestRevisionWithSource{
			AppRevision: encodedRevision,
			Source:      *porterApp.ToPorterAppType(),
		})
	}

	c.WriteResult(w, r, res)
}
