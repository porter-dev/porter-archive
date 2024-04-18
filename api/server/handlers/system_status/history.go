package systemstatus

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
	"github.com/porter-dev/porter/internal/telemetry"
)

// HistoryHandler handles requests to fetch history of system status
type HistoryHandler struct {
	handlers.PorterHandlerWriter
}

// NewHistoryHandler returns a HistoryHandler
func NewHistoryHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *HistoryHandler {
	return &HistoryHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (p *HistoryHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-system-service-status-handler")
	defer span.End()

	// read the project and cluster from context
	project, _ := ctx.Value(types.ProjectScope).(*models.Project)
	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)
	telemetry.WithAttributes(
		span,
		telemetry.AttributeKV{Key: "project_id", Value: project.ID},
		telemetry.AttributeKV{Key: "cluster_id", Value: cluster.ID},
	)
	cloudProvider := p.getCloudProviderEnum(cluster.CloudProvider)
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "cloud_provider", Value: cloudProvider.String()})

	request := connect.NewRequest(&porterv1.SystemStatusHistoryRequest{
		ProjectId:     int64(project.ID),
		ClusterId:     int64(cluster.ID),
		CloudProvider: cloudProvider,
	})
	resp, err := p.Config().ClusterControlPlaneClient.SystemStatusHistory(ctx, request)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error getting system status history from ccp")
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}
	systemStatusHistory, err := types.ToSystemStatusHistory(resp.Msg)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error converting to system status history type")
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}
	p.WriteResult(w, r, systemStatusHistory)
}

func (p *HistoryHandler) getCloudProviderEnum(cloudProvider string) porterv1.EnumCloudProvider {
	switch cloudProvider {
	case "AWS":
		return porterv1.EnumCloudProvider_ENUM_CLOUD_PROVIDER_AWS
	case "AZURE":
		return porterv1.EnumCloudProvider_ENUM_CLOUD_PROVIDER_AZURE
	case "GCP":
		return porterv1.EnumCloudProvider_ENUM_CLOUD_PROVIDER_GCP
	default:
		// We use unspecified to mean local kind cluster which is used in testing
		return porterv1.EnumCloudProvider_ENUM_CLOUD_PROVIDER_UNSPECIFIED
	}
}
