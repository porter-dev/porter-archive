package porter_app

import (
	"net/http"

	"connectrpc.com/connect"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"

	"github.com/porter-dev/porter/internal/telemetry"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

// PredeployStatusHandler handles requests to the /apps/{porter_app_name}/{app_revision_id}/predeploy-status endpoint
type PredeployStatusHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

// NewPredeployStatusHandler returns a new PredeployStatusHandler
func NewPredeployStatusHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *PredeployStatusHandler {
	return &PredeployStatusHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

// PredeployStatus is the status of the predeploy
type PredeployStatus string

const (
	// PredeployStatus_InProgress signifies the predeploy is still running
	PredeployStatus_InProgress PredeployStatus = "in-progress"
	// PredeployStatus_Failed signifies the predeploy has failed
	PredeployStatus_Failed PredeployStatus = "failed"
	// PredeployStatus_Successful signifies the predeploy was successful
	PredeployStatus_Successful PredeployStatus = "successful"
)

// PredeployStatusResponse is the response object for the /apps/{porter_app_name}/{app_revision_id}/predeploy-status endpoint
type PredeployStatusResponse struct {
	// Status is the status of the predeploy
	Status PredeployStatus `json:"status"`
}

// ServeHTTP forwards the predeploy status request to the cluster control plane and returns the response
func (c *PredeployStatusHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-predeploy-status")
	defer span.End()

	project, _ := ctx.Value(types.ProjectScope).(*models.Project)
	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)
	name, _ := requestutils.GetURLParamString(r, types.URLParamPorterAppName)
	appRevisionId, _ := requestutils.GetURLParamString(r, types.URLParamAppRevisionID)

	if appRevisionId == "" {
		err := telemetry.Error(ctx, span, nil, "app revision id is empty")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "project-id", Value: project.ID},
		telemetry.AttributeKV{Key: "cluster-id", Value: cluster.ID},
		telemetry.AttributeKV{Key: "app-name", Value: name},
		telemetry.AttributeKV{Key: "app-revision-id", Value: appRevisionId},
	)

	predeployStatusReq := connect.NewRequest(&porterv1.PredeployStatusRequest{
		ProjectId:     int64(project.ID),
		AppRevisionId: appRevisionId,
	})
	ccpResp, err := c.Config().ClusterControlPlaneClient.PredeployStatus(ctx, predeployStatusReq)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error calling ccp apply porter app")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	if ccpResp == nil {
		err := telemetry.Error(ctx, span, err, "ccp resp is nil")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}
	if ccpResp.Msg == nil {
		err := telemetry.Error(ctx, span, err, "ccp resp msg is nil")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "predeploy-status", Value: ccpResp.Msg.PredeployStatus})

	var status PredeployStatus
	switch ccpResp.Msg.PredeployStatus {
	case porterv1.EnumPredeployStatus_ENUM_PREDEPLOY_STATUS_IN_PROGRESS:
		status = PredeployStatus_InProgress
	case porterv1.EnumPredeployStatus_ENUM_PREDEPLOY_STATUS_FAILED:
		status = PredeployStatus_Failed
	case porterv1.EnumPredeployStatus_ENUM_PREDEPLOY_STATUS_SUCCESSFUL:
		status = PredeployStatus_Successful
	default:
		err := telemetry.Error(ctx, span, nil, "ccp resp predeploy status is invalid")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	response := &PredeployStatusResponse{
		Status: status,
	}

	c.WriteResult(w, r, response)
}
