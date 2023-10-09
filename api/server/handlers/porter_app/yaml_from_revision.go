package porter_app

import (
	"encoding/base64"
	"net/http"

	"connectrpc.com/connect"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"gopkg.in/yaml.v2"

	"github.com/porter-dev/porter/internal/deployment_target"
	"github.com/porter-dev/porter/internal/porter_app"
	v2 "github.com/porter-dev/porter/internal/porter_app/v2"
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

// PorterYAMLFromRevisionHandler is the handler for the /apps/{porter_app_name}/revisions/{app_revision_id}/yaml endpoint
type PorterYAMLFromRevisionHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

// NewPorterYAMLFromRevisionHandler returns a new PorterYAMLFromRevisionHandler
func NewPorterYAMLFromRevisionHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *PorterYAMLFromRevisionHandler {
	return &PorterYAMLFromRevisionHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

// PorterYAMLFromRevisionResponse is the response object for the /apps/{porter_app_name}/revisions/{app_revision_id}/yaml endpoint
type PorterYAMLFromRevisionResponse struct {
	B64PorterYAML string `json:"b64_porter_yaml"`
}

func (c *PorterYAMLFromRevisionHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-porter-yaml-from-revision")
	defer span.End()

	project, _ := r.Context().Value(types.ProjectScope).(*models.Project)
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	appRevisionID, reqErr := requestutils.GetURLParamString(r, types.URLParamAppRevisionID)
	if reqErr != nil {
		err := telemetry.Error(ctx, span, nil, "error parsing app revision id")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	agent, err := c.GetAgent(r, cluster, "")
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error getting agent")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	getRevisionReq := connect.NewRequest(&porterv1.GetAppRevisionRequest{
		ProjectId:     int64(project.ID),
		AppRevisionId: appRevisionID,
	})
	ccpResp, err := c.Config().ClusterControlPlaneClient.GetAppRevision(ctx, getRevisionReq)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error getting app revision")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	if ccpResp == nil || ccpResp.Msg == nil {
		err = telemetry.Error(ctx, span, nil, "get app revision response is nil")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	encodedRevision, err := porter_app.EncodedRevisionFromProto(ctx, ccpResp.Msg.AppRevision)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error getting encoded revision from proto")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	deploymentTarget, err := deployment_target.DeploymentTargetDetails(ctx, deployment_target.DeploymentTargetDetailsInput{
		ProjectID:          int64(project.ID),
		ClusterID:          int64(cluster.ID),
		DeploymentTargetID: ccpResp.Msg.AppRevision.DeploymentTargetId,
		CCPClient:          c.Config().ClusterControlPlaneClient,
	})
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error getting deployment target details")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	revisionWithEnv, err := porter_app.AttachEnvToRevision(ctx, porter_app.AttachEnvToRevisionInput{
		ProjectID:           project.ID,
		ClusterID:           int(cluster.ID),
		Revision:            encodedRevision,
		DeploymentTarget:    deploymentTarget,
		K8SAgent:            agent,
		PorterAppRepository: c.Repo().PorterApp(),
	})
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error attaching env to revision")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	appProto := revisionWithEnv.B64AppProto
	if appProto == nil {
		err = telemetry.Error(ctx, span, nil, "app proto is nil")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	app, err := v2.AppFromProto(appProto)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error converting app proto to porter yaml")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	porterYAMLString, err := yaml.Marshal(app)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error marshaling porter yaml")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	b64String := base64.StdEncoding.EncodeToString(porterYAMLString)

	response := &PorterYAMLFromRevisionResponse{
		B64PorterYAML: b64String,
	}

	c.WriteResult(w, r, response)
}
