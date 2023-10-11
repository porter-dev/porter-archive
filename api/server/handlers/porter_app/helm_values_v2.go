package porter_app

import (
	"encoding/base64"
	"net/http"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/shared/requestutils"

	"connectrpc.com/connect"

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

// AppHelmValuesHandler handles requests to the /apps/{porter_app_name}/helm-values endpoint
type AppHelmValuesHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

// NewAppHelmValuesHandler returns a new AppHelmValuesHandler
func NewAppHelmValuesHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *AppHelmValuesHandler {
	return &AppHelmValuesHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

// AppHelmValuesRequest is the request object for the /apps/{porter_app_name}/helm-values endpoint
type AppHelmValuesRequest struct {
	AppID              uint   `schema:"app_id"`
	DeploymentTargetID string `schema:"deployment_target_id"`
	WithDefaults       bool   `schema:"with_defaults"`
}

// AppHelmValuesResponse is the response object for the /apps/{porter_app_name}/helm-values endpoint
type AppHelmValuesResponse struct {
	// AppRevision is the latest revision for the app
	HelmValues string `json:"helm_values"`
}

// ServeHTTP translates the request into a helmValues grpc request, forwards to the cluster control plane, and returns the response.
func (c *AppHelmValuesHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-app-helm-values")
	defer span.End()

	project, _ := ctx.Value(types.ProjectScope).(*models.Project)
	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "project-id", Value: project.ID},
		telemetry.AttributeKV{Key: "cluster-id", Value: cluster.ID},
	)

	appName, reqErr := requestutils.GetURLParamString(r, types.URLParamPorterAppName)
	if reqErr != nil {
		e := telemetry.Error(ctx, span, reqErr, "error parsing app name from url")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusBadRequest))
		return
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "app-name", Value: appName})

	request := &AppHelmValuesRequest{}
	if ok := c.DecodeAndValidate(w, r, request); !ok {
		err := telemetry.Error(ctx, span, nil, "error decoding request")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	_, err := uuid.Parse(request.DeploymentTargetID)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error parsing deployment target id")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "deployment-target-id", Value: request.DeploymentTargetID})

	if request.AppID == 0 {
		err := telemetry.Error(ctx, span, nil, "app id is required")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "app-id", Value: request.AppID})

	helmValuesReq := connect.NewRequest(&porterv1.AppHelmValuesRequest{
		ProjectId:          int64(project.ID),
		AppId:              int64(request.AppID),
		DeploymentTargetId: request.DeploymentTargetID,
		WithDefaults:       request.WithDefaults,
	})

	helmValuesResp, err := c.Config().ClusterControlPlaneClient.AppHelmValues(ctx, helmValuesReq)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error getting app helm values from cluster control plane client")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	if helmValuesResp == nil || helmValuesResp.Msg == nil {
		err := telemetry.Error(ctx, span, err, "app helm values resp is nil")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	decodedValues, err := base64.StdEncoding.DecodeString(helmValuesResp.Msg.B64Values)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error decoding helm values")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	response := AppHelmValuesResponse{
		HelmValues: string(decodedValues),
	}

	c.WriteResult(w, r, response)
}
