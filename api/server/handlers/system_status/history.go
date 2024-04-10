package systemstatus

import (
	"fmt"
	"net/http"

	"connectrpc.com/connect"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
)

// SystemStatusHistoryHandler handles requests to fetch history of system status
type SystemStatusHistoryHandler struct {
	handlers.PorterHandlerWriter
}

// NewSystemStatusHistoryHandler returns a SystemStatusHistoryHandler
func NewSystemStatusHistoryHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *SystemStatusHistoryHandler {
	return &SystemStatusHistoryHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (p *SystemStatusHistoryHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-system-service-status-handler")
	defer span.End()

	// read the project and cluster from context
	project, _ := ctx.Value(types.ProjectScope).(*models.Project)
	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)
	cloudProvider, err := p.getCloudProviderEnum(cluster.CloudProvider)
	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}
	request := connect.NewRequest(&porterv1.SystemStatusHistoryRequest{
		ProjectId:     int64(project.ID),
		ClusterId:     int64(cluster.ID),
		CloudProvider: cloudProvider,
	})
	resp, err := p.Config().ClusterControlPlaneClient.SystemStatusHistory(ctx, request)
	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}
	systemStatusHistory, err := types.ToSystemStatusHistory(resp.Msg)
	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}
	p.WriteResult(w, r, systemStatusHistory)
}

func (p *SystemStatusHistoryHandler) getCloudProviderEnum(cloudProvider string) (porterv1.EnumCloudProvider, error) {
	switch cloudProvider {
	case "AWS":
		return porterv1.EnumCloudProvider_ENUM_CLOUD_PROVIDER_AWS, nil
	case "AZURE":
		return porterv1.EnumCloudProvider_ENUM_CLOUD_PROVIDER_AZURE, nil
	case "GCP":
		return porterv1.EnumCloudProvider_ENUM_CLOUD_PROVIDER_GCP, nil
	default:
		return porterv1.EnumCloudProvider_ENUM_CLOUD_PROVIDER_UNSPECIFIED, fmt.Errorf("unknown could provider")
	}
}
