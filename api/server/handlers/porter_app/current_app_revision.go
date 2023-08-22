package porter_app

import (
	"encoding/base64"
	"net/http"

	"connectrpc.com/connect"

	"github.com/porter-dev/api-contracts/generated/go/helpers"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"

	"github.com/google/uuid"

	"github.com/porter-dev/porter/internal/telemetry"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

// CurrentAppRevisionHandler handles requests to the /apps/current-app-revision endpoint
type CurrentAppRevisionHandler struct {
	handlers.PorterHandlerReadWriter
}

// NewCurrentAppRevisionHandler returns a new CurrentAppRevisionHandler
func NewCurrentAppRevisionHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *CurrentAppRevisionHandler {
	return &CurrentAppRevisionHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

// CurrentAppRevisionRequest is the request object for the /apps/current-app-revision endpoint
type CurrentAppRevisionRequest struct {
	AppName            string `schema:"app_name"`
	DeploymentTargetID string `schema:"deployment_target_id"`
}

// CurrentAppRevisionResponse is the response object for the /apps/current-app-revision endpoint
type CurrentAppRevisionResponse struct {
	B64AppProto string `json:"b64_app_proto"`
}

// ServeHTTP translates the request into a CurrentAppRevision grpc request, forwards to the cluster control plane, and returns the response.
// Multi-cluster projects are not supported, as they may have multiple porter-apps with the same name in the same project.
func (c *CurrentAppRevisionHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-current-app-revision")
	defer span.End()

	project, _ := ctx.Value(types.ProjectScope).(*models.Project)
	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "project-id", Value: project.ID},
		telemetry.AttributeKV{Key: "cluster-id", Value: cluster.ID},
	)

	request := &CurrentAppRevisionRequest{}
	if ok := c.DecodeAndValidate(w, r, request); !ok {
		err := telemetry.Error(ctx, span, nil, "error decoding request")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	if request.AppName == "" {
		err := telemetry.Error(ctx, span, nil, "app name is required")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "app-name", Value: request.AppName})

	_, err := uuid.Parse(request.DeploymentTargetID)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error parsing deployment target id")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "deployment-target-id", Value: request.DeploymentTargetID})

	porterApps, err := c.Repo().PorterApp().ReadPorterAppsByProjectIDAndName(project.ID, request.AppName)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error getting porter app from repo")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	if len(porterApps) == 0 {
		err := telemetry.Error(ctx, span, err, "no porter apps returned")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	if len(porterApps) > 1 {
		err := telemetry.Error(ctx, span, err, "multiple porter apps returned: multi-cluster not supported")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	if porterApps[0].ID == 0 {
		err := telemetry.Error(ctx, span, err, "porter app id is missiong")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	currentAppRevisionReq := connect.NewRequest(&porterv1.CurrentAppRevisionRequest{
		ProjectId:          int64(project.ID),
		PorterAppId:        int64(porterApps[0].ID),
		DeploymentTargetId: request.DeploymentTargetID,
	})

	currentAppRevisionResp, err := c.Config().ClusterControlPlaneClient.CurrentAppRevision(ctx, currentAppRevisionReq)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error getting current app revision from cluster control plane client")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	if currentAppRevisionResp == nil || currentAppRevisionResp.Msg == nil {
		err := telemetry.Error(ctx, span, err, "current app revision resp is nil")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	if currentAppRevisionResp.Msg.App == nil {
		err := telemetry.Error(ctx, span, err, "current app revision definition is nil")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	encoded, err := helpers.MarshalContractObject(ctx, currentAppRevisionResp.Msg.App)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error marshalling app proto back to json")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	b64 := base64.StdEncoding.EncodeToString(encoded)

	response := &CurrentAppRevisionResponse{
		B64AppProto: b64,
	}

	c.WriteResult(w, r, response)
}
