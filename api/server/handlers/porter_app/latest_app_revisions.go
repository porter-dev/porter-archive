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

// LatestAppRevisionsRequest represents the request for the /apps/revisions endpoint
type LatestAppRevisionsRequest struct {
	DeploymentTargetID string `schema:"deployment_target_id"`
	// if true, apps in a preview deployment target will be filtered out
	IgnorePreviewApps bool `schema:"ignore_preview_apps"`
}

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

	request := &LatestAppRevisionsRequest{}
	if ok := c.DecodeAndValidate(w, r, request); !ok {
		err := telemetry.Error(ctx, span, nil, "error decoding request")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "project-id", Value: project.ID},
		telemetry.AttributeKV{Key: "cluster-id", Value: cluster.ID},
		telemetry.AttributeKV{Key: "deployment-target-id", Value: request.DeploymentTargetID},
		telemetry.AttributeKV{Key: "ignore-preview-apps", Value: request.IgnorePreviewApps},
	)

	var deploymentTargetIdentifier *porterv1.DeploymentTargetIdentifier
	if request.DeploymentTargetID != "" {
		deploymentTargetIdentifier = &porterv1.DeploymentTargetIdentifier{
			Id: request.DeploymentTargetID,
		}
	}

	listAppRevisionsReq := connect.NewRequest(&porterv1.LatestAppRevisionsRequest{
		ProjectId:                  int64(project.ID),
		DeploymentTargetIdentifier: deploymentTargetIdentifier,
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

	deploymentTargets := map[string]*porterv1.DeploymentTarget{}

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

		deploymentTarget, ok := deploymentTargets[encodedRevision.DeploymentTarget.ID]
		if !ok {
			details, err := c.Config().ClusterControlPlaneClient.DeploymentTargetDetails(ctx, connect.NewRequest(&porterv1.DeploymentTargetDetailsRequest{
				ProjectId:          int64(project.ID),
				DeploymentTargetId: encodedRevision.DeploymentTarget.ID,
			}))
			if err != nil {
				err := telemetry.Error(ctx, span, err, "error getting deployment target details")
				c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
				return
			}

			if details == nil || details.Msg == nil || details.Msg.DeploymentTarget == nil {
				err := telemetry.Error(ctx, span, err, "deployment target details are nil")
				c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
				return
			}

			deploymentTarget = details.Msg.DeploymentTarget
			deploymentTargets[encodedRevision.DeploymentTarget.ID] = deploymentTarget
		}

		// TODO: move this filtering to CCP
		if request.IgnorePreviewApps && deploymentTarget.IsPreview {
			continue
		}

		// TODO: move this filtering to CCP
		if cluster.ID != uint(deploymentTarget.ClusterId) {
			continue
		}

		encodedRevision.DeploymentTarget.Name = deploymentTarget.Name

		res.AppRevisions = append(res.AppRevisions, LatestRevisionWithSource{
			AppRevision: encodedRevision,
			Source:      *porterApp.ToPorterAppType(),
		})
	}

	c.WriteResult(w, r, res)
}
