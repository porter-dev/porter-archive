package porter_app

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/deployment_target"
	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
)

// JobStatusHandler is the handler for GET /apps/jobs
type JobStatusHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

// NewJobStatusHandler returns a new JobStatusHandler
func NewJobStatusHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *JobStatusHandler {
	return &JobStatusHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

// JobStatusRequest is the expected format for a request body on GET /apps/jobs
type JobStatusRequest struct {
	DeploymentTargetID string `schema:"deployment_target_id"`
	JobName            string `schema:"job_name"`
}

func (c *JobStatusHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-job-status")
	defer span.End()

	request := &JobStatusRequest{}
	if ok := c.DecodeAndValidate(w, r, request); !ok {
		err := telemetry.Error(ctx, span, nil, "invalid request")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)
	project, _ := ctx.Value(types.ProjectScope).(*models.Project)

	name, reqErr := requestutils.GetURLParamString(r, types.URLParamPorterAppName)
	if reqErr != nil {
		err := telemetry.Error(ctx, span, reqErr, "invalid porter app name")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "app-name", Value: name})

	if request.DeploymentTargetID == "" {
		err := telemetry.Error(ctx, span, nil, "must provide deployment target id")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "deployment-target-id", Value: request.DeploymentTargetID})

	deploymentTarget, err := deployment_target.DeploymentTargetDetails(ctx, deployment_target.DeploymentTargetDetailsInput{
		ProjectID:          int64(project.ID),
		ClusterID:          int64(cluster.ID),
		DeploymentTargetID: request.DeploymentTargetID,
		CCPClient:          c.Config().ClusterControlPlaneClient,
	})
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error getting deployment target details")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	namespace := deploymentTarget.Namespace
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "namespace", Value: namespace})

	agent, err := c.GetAgent(r, cluster, "")
	if err != nil {
		err = telemetry.Error(ctx, span, err, "unable to get agent")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	labels := []kubernetes.Label{
		{
			Key: "porter.run/deployment-target-id",
			Val: request.DeploymentTargetID,
		},
		{
			Key: "porter.run/app-name",
			Val: name,
		},
	}
	if request.JobName != "" {
		labels = append(labels, kubernetes.Label{
			Key: "porter.run/service-name",
			Val: request.JobName,
		})
	}
	jobs, err := agent.ListJobsByLabel(namespace, labels...)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error listing jobs")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	c.WriteResult(w, r, jobs)
}
