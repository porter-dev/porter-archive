package porter_app

import (
	"net/http"

	"github.com/porter-dev/porter/internal/kubernetes/prometheus"

	"connectrpc.com/connect"

	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/porter/internal/telemetry"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

// AppMetricsHandler handles the /apps/metrics endpoint
type AppMetricsHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

// NewAppMetricsHandler returns a new AppMetricsHandler
func NewAppMetricsHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *AppMetricsHandler {
	return &AppMetricsHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

// MetricsRequest is the expected request body for the /apps/metrics endpoint
type MetricsRequest struct {
	// Deployment target of the app to query for metrics
	DeploymentTargetID string `schema:"deployment_target_id"`

	// Below is just a copy of prometheus.QueryOpts, other than namespace
	// the name of the metric being queried for
	Metric    string   `schema:"metric"`
	ShouldSum bool     `schema:"shouldsum"`
	Kind      string   `schema:"kind"`
	PodList   []string `schema:"pods"`
	Name      string   `schema:"name"`
	// start time (in unix timestamp) for prometheus results
	StartRange uint `schema:"startrange"`
	// end time time (in unix timestamp) for prometheus results
	EndRange   uint    `schema:"endrange"`
	Resolution string  `schema:"resolution"`
	Percentile float64 `schema:"percentile"`
}

// ServeHTTP returns metrics for a given app in the provided deployment target
func (c *AppMetricsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-app-metrics")
	defer span.End()
	r = r.Clone(ctx)
	project, _ := ctx.Value(types.ProjectScope).(*models.Project)
	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)

	request := &MetricsRequest{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		err := telemetry.Error(ctx, span, nil, "error decoding request")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	if request.DeploymentTargetID == "" {
		err := telemetry.Error(ctx, span, nil, "must provide deployment target id")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "deployment-target-id", Value: request.DeploymentTargetID})

	deploymentTargetDetailsReq := connect.NewRequest(&porterv1.DeploymentTargetDetailsRequest{
		ProjectId:          int64(project.ID),
		DeploymentTargetId: request.DeploymentTargetID,
	})

	deploymentTargetDetailsResp, err := c.Config().ClusterControlPlaneClient.DeploymentTargetDetails(ctx, deploymentTargetDetailsReq)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error getting deployment target details from cluster control plane client")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	if deploymentTargetDetailsResp == nil || deploymentTargetDetailsResp.Msg == nil {
		err := telemetry.Error(ctx, span, err, "deployment target details resp is nil")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	if deploymentTargetDetailsResp.Msg.ClusterId != int64(cluster.ID) {
		err := telemetry.Error(ctx, span, err, "deployment target details resp cluster id does not match cluster id")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	namespace := deploymentTargetDetailsResp.Msg.Namespace
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "namespace", Value: namespace})

	agent, err := c.GetAgent(r, cluster, "")
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error getting k8s agent")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	// get prometheus service
	promSvc, found, err := prometheus.GetPrometheusService(agent.Clientset)
	if err != nil || !found {
		err = telemetry.Error(ctx, span, err, "error getting prometheus service")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "metric", Value: request.Metric},
		telemetry.AttributeKV{Key: "shouldsum", Value: request.ShouldSum},
		telemetry.AttributeKV{Key: "kind", Value: request.Kind},
		telemetry.AttributeKV{Key: "name", Value: request.Name},
		telemetry.AttributeKV{Key: "start-range", Value: request.StartRange},
		telemetry.AttributeKV{Key: "end-range", Value: request.EndRange},
		telemetry.AttributeKV{Key: "resolution", Value: request.Resolution},
		telemetry.AttributeKV{Key: "percentile", Value: request.Percentile},
	)

	queryOpts := &prometheus.QueryOpts{
		Metric:     request.Metric,
		ShouldSum:  request.ShouldSum,
		Kind:       request.Kind,
		Name:       request.Name,
		Namespace:  namespace,
		StartRange: request.StartRange,
		EndRange:   request.EndRange,
		Resolution: request.Resolution,
		Percentile: request.Percentile,
	}

	rawQuery, err := prometheus.QueryPrometheus(agent.Clientset, promSvc, queryOpts)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error querying prometheus")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	c.WriteResult(w, r, rawQuery)
}
