package registry

import (
	"fmt"
	"net/http"

	"connectrpc.com/connect"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
)

type StatusHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewStatusHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *StatusHandler {
	return &StatusHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

type StatusResponse struct {
	ProjectID  int  `json:"project_id"`
	RegistryID int  `json:"registry_id"`
	Status     bool `json:"status"`
}

func (c *StatusHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-cluster-status")
	defer span.End()

	registry, _ := ctx.Value(types.RegistryScope).(*models.Registry)
	req := connect.NewRequest(&porterv1.ECRStatusRequest{
		ProjectId:  int64(registry.ProjectID),
		RegistryId: int64(registry.ID),
	})
	status, err := c.Config().ClusterControlPlaneClient.ECRStatus(ctx, req)
	if err != nil {
		err := fmt.Errorf("unable to retrieve status for cluster: %w", err)
		err = telemetry.Error(ctx, span, err, err.Error())
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}
	if status.Msg == nil {
		err := fmt.Errorf("unable to parse status for cluster: %w", err)
		err = telemetry.Error(ctx, span, err, err.Error())
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}
	statusResp := status.Msg

	resp := StatusResponse{
		ProjectID:  int(registry.ProjectID),
		RegistryID: int(registry.ID),
		Status:     statusResp.Scanned,
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "registry-status", Value: statusResp.Scanned},
	)

	c.WriteResult(w, r, resp)
	w.WriteHeader(http.StatusOK)
}
