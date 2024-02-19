package porter_app

import (
	"net/http"

	"connectrpc.com/connect"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/porter_app"
	"github.com/porter-dev/porter/internal/telemetry"
)

// JobStatusByNameHandler is the handler for GET /apps/jobs/{porter_app_name}/{job_run_name}
type JobStatusByNameHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

// NewJobStatusByNameHandler returns a new JobStatusByNameHandler
func NewJobStatusByNameHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *JobStatusByNameHandler {
	return &JobStatusByNameHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

// JobStatusByNameRequest is the expected format for a request body on GET /apps/jobs/{porter_app_name}/{job_run_name}
type JobStatusByNameRequest struct {
	DeploymentTargetID   string `schema:"deployment_target_id,omitempty"`
	DeploymentTargetName string `schema:"deployment_target_name,omitempty"`
	JobRunName           string `schema:"job_run_name"`
}

// JobStatusByNameResponse is the response format for GET /apps/jobs/{porter_app_name}/{job_run_name}
type JobStatusByNameResponse struct {
	JobRun porter_app.JobRun `json:"job_run"`
}

func (c *JobStatusByNameHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-job-status")
	defer span.End()

	request := &JobStatusByNameRequest{}
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

	jobRunName, reqErr := requestutils.GetURLParamString(r, types.URLParamJobRunName)
	if reqErr != nil {
		err := telemetry.Error(ctx, span, reqErr, "invalid job run name")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	deploymentTargetName := request.DeploymentTargetName
	if request.DeploymentTargetName == "" && request.DeploymentTargetID == "" {
		defaultDeploymentTarget, err := defaultDeploymentTarget(ctx, defaultDeploymentTargetInput{
			ProjectID:                 project.ID,
			ClusterID:                 cluster.ID,
			ClusterControlPlaneClient: c.Config().ClusterControlPlaneClient,
		})
		if err != nil {
			err := telemetry.Error(ctx, span, err, "error getting default deployment target")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}
		deploymentTargetName = defaultDeploymentTarget.Name
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "deployment-target-name", Value: deploymentTargetName},
		telemetry.AttributeKV{Key: "deployment-target-id", Value: request.DeploymentTargetID},
	)

	jobRunsRequest := connect.NewRequest(&porterv1.JobRunStatusRequest{
		ProjectId: int64(project.ID),
		DeploymentTargetIdentifier: &porterv1.DeploymentTargetIdentifier{
			Id:   request.DeploymentTargetID,
			Name: deploymentTargetName,
		},
		JobRunName: jobRunName,
	})

	jobRunResp, err := c.Config().ClusterControlPlaneClient.JobRunStatus(ctx, jobRunsRequest)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error getting job run from cluster control plane client")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	if jobRunResp == nil || jobRunResp.Msg == nil {
		err := telemetry.Error(ctx, span, nil, "job run response is nil")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	run, err := porter_app.JobRunFromProto(ctx, jobRunResp.Msg.JobRun)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error converting job run from proto")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	res := JobStatusByNameResponse{
		JobRun: run,
	}

	c.WriteResult(w, r, res)
}
