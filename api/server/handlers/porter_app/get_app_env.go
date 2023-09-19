package porter_app

import (
	"encoding/base64"
	"net/http"

	"github.com/google/uuid"
	"github.com/porter-dev/api-contracts/generated/go/helpers"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/kubernetes/environment_groups"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/porter_app"
	"github.com/porter-dev/porter/internal/telemetry"
)

// GetAppEnvHandler is the handler for the /apps/{porter_app_name}/revisions/{app_revision_id}/env endpoint
type GetAppEnvHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

// NewGetAppEnvHandler handles GET requests to the /apps/{porter_app_name}/revisions/{app_revision_id}/env endpoint
func NewGetAppEnvHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *GetAppEnvHandler {
	return &GetAppEnvHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

// GetAppEnvRequest is the request object for the /apps/{porter_app_name}/revisions/{app_revision_id}/env endpoint
type GetAppEnvRequest struct {
	// EnvGroups is a list of environment group names to query. If empty, all environment groups will be queried
	EnvGroups []string `json:"env_groups"`
}

// GetAppEnvResponse is the response object for the /apps/{porter_app_name}/revisions/{app_revision_id}/env endpoint
type GetAppEnvResponse struct {
	EnvGroups []environment_groups.EnvironmentGroup `json:"env_groups"`
}

// ServeHTTP translates the request into a GetAppEnvRequest request, uses the revision proto to query the cluster for the requested env groups, and returns the response
func (c *GetAppEnvHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-get-app-env")
	defer span.End()

	project, _ := ctx.Value(types.ProjectScope).(*models.Project)
	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)

	if !project.GetFeatureFlag(models.ValidateApplyV2, c.Config().LaunchDarklyClient) {
		err := telemetry.Error(ctx, span, nil, "project does not have validate apply v2 enabled")
		c.HandleAPIError(w, r, apierrors.NewErrForbidden(err))
		return
	}

	revisionID, reqErr := requestutils.GetURLParamString(r, types.URLParamAppRevisionID)
	if reqErr != nil {
		err := telemetry.Error(ctx, span, nil, "error parsing app revision id")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	appRevisionUuid, err := uuid.Parse(revisionID)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error parsing app revision id")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	if appRevisionUuid == uuid.Nil {
		err := telemetry.Error(ctx, span, nil, "app revision id is nil")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "app-revision-id", Value: appRevisionUuid.String()})

	request := &GetAppEnvRequest{}
	if ok := c.DecodeAndValidate(w, r, request); !ok {
		err := telemetry.Error(ctx, span, nil, "error decoding request")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	revision, err := porter_app.GetAppRevision(ctx, porter_app.GetAppRevisionInput{
		AppRevisionID: appRevisionUuid,
		ProjectID:     project.ID,
		CCPClient:     c.Config().ClusterControlPlaneClient,
	})
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error getting app revision")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	decoded, err := base64.StdEncoding.DecodeString(revision.B64AppProto)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error decoding base proto")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	appProto := &porterv1.PorterApp{}
	err = helpers.UnmarshalContractObject(decoded, appProto)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error unmarshalling app proto")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	agent, err := c.GetAgent(r, cluster, "")
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error getting agent")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	envFromProtoInp := porter_app.AppEnvironmentFromProtoInput{
		ProjectID: project.ID,
		ClusterID: int(cluster.ID),
		App:       appProto,
		K8SAgent:  agent,
	}

	envGroups, err := porter_app.AppEnvironmentFromProto(ctx, envFromProtoInp, porter_app.WithEnvGroupFilter(request.EnvGroups), porter_app.WithSecrets())
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error getting app environment from revision")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	res := &GetAppEnvResponse{
		EnvGroups: envGroups,
	}

	c.WriteResult(w, r, res)
}
