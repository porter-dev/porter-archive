package addons

import (
	"encoding/base64"
	"net/http"

	"connectrpc.com/connect"
	"github.com/porter-dev/api-contracts/generated/go/helpers"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
)

// LatestAddonsHandler handles requests to the /addons/latest endpoint
type LatestAddonsHandler struct {
	handlers.PorterHandlerReadWriter
}

// NewLatestAddonsHandler returns a new LatestAddonsHandler
func NewLatestAddonsHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *LatestAddonsHandler {
	return &LatestAddonsHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

// LatestAddonsRequest represents the request for the /addons/latest endpoint
type LatestAddonsRequest struct {
	DeploymentTargetID string `schema:"deployment_target_id"`
}

// LatestAddonsResponse represents the response from the /addons/latest endpoint
type LatestAddonsResponse struct {
	Base64Addons []string `json:"base64_addons"`
}

func (c *LatestAddonsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-list-addons")
	defer span.End()

	project, _ := r.Context().Value(types.ProjectScope).(*models.Project)
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	request := &LatestAddonsRequest{}
	if ok := c.DecodeAndValidate(w, r, request); !ok {
		err := telemetry.Error(ctx, span, nil, "error decoding request")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "project-id", Value: project.ID},
		telemetry.AttributeKV{Key: "cluster-id", Value: cluster.ID},
		telemetry.AttributeKV{Key: "deployment-target-id", Value: request.DeploymentTargetID},
	)

	var deploymentTargetIdentifier *porterv1.DeploymentTargetIdentifier
	if request.DeploymentTargetID != "" {
		deploymentTargetIdentifier = &porterv1.DeploymentTargetIdentifier{
			Id: request.DeploymentTargetID,
		}
	}

	latestAddonsReq := connect.NewRequest(&porterv1.LatestAddonsRequest{
		ProjectId:                  int64(project.ID),
		ClusterId:                  int64(cluster.ID),
		DeploymentTargetIdentifier: deploymentTargetIdentifier,
	})

	latestAddonsResp, err := c.Config().ClusterControlPlaneClient.LatestAddons(ctx, latestAddonsReq)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error getting latest addons")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	if latestAddonsResp == nil || latestAddonsResp.Msg == nil {
		err = telemetry.Error(ctx, span, nil, "latest addons response is nil")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	res := &LatestAddonsResponse{
		Base64Addons: []string{},
	}

	for _, addon := range latestAddonsResp.Msg.Addons {
		by, err := helpers.MarshalContractObject(ctx, addon)
		if err != nil {
			err = telemetry.Error(ctx, span, err, "error marshaling addon")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}

		encoded := base64.StdEncoding.EncodeToString(by)
		res.Base64Addons = append(res.Base64Addons, encoded)
	}

	c.WriteResult(w, r, res)
}
