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
	"github.com/porter-dev/porter/internal/deployment_target"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/porter_app"
	"github.com/porter-dev/porter/internal/telemetry"
)

// GetBuildFromRevisionHandler is the handler for the /apps/{porter_app_name}/revisions/{app_revision_id}/build endpoint
type GetBuildFromRevisionHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

// NewGetBuildFromRevisionHandler handles GET requests to the /apps/{porter_app_name}/revisions/{app_revision_id}/build endpoint
func NewGetBuildFromRevisionHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *GetBuildFromRevisionHandler {
	return &GetBuildFromRevisionHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

// Image is the image used by an app with a docker registry source
type Image struct {
	Repository string `json:"repository"`
	Tag        string `json:"tag"`
}

// BuildSettings is the set of fields for a revision's build
type BuildSettings struct {
	Method     string   `json:"method"`
	Context    string   `json:"context"`
	Builder    string   `json:"builder"`
	Buildpacks []string `json:"buildpacks"`
	Dockerfile string   `json:"dockerfile"`
	CommitSHA  string   `json:"commit_sha"`
}

// GetBuildFromRevisionResponse is the response object for the /apps/{porter_app_name}/revisions/{app_revision_id}/build endpoint
type GetBuildFromRevisionResponse struct {
	BuildEnvVariables map[string]string `json:"build_env_variables"`
	Build             BuildSettings     `json:"build"`
	Image             Image             `json:"image"`
}

// ServeHTTP translates the request into a GetBuildFromRevisionRequest request, uses the proto to query the revision for the build settings, and returns the response
func (c *GetBuildFromRevisionHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-get-build")
	defer span.End()

	project, _ := ctx.Value(types.ProjectScope).(*models.Project)
	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "project-id", Value: project.ID},
		telemetry.AttributeKV{Key: "cluster-id", Value: cluster.ID},
	)

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

	resp := &GetBuildFromRevisionResponse{}

	appProto := &porterv1.PorterApp{}
	err = helpers.UnmarshalContractObject(decoded, appProto)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error unmarshalling app proto")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	if appProto.Image == nil {
		err := telemetry.Error(ctx, span, nil, "app proto does not have image settings. Tag is unknown")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	resp.Image = Image{
		Repository: appProto.Image.Repository,
		Tag:        appProto.Image.Tag,
	}

	if appProto.Build == nil {
		c.WriteResult(w, r, resp)
		return
	}

	resp.Build = BuildSettings{
		Method:     appProto.Build.Method,
		Context:    appProto.Build.Context,
		Builder:    appProto.Build.Builder,
		Buildpacks: appProto.Build.Buildpacks,
		Dockerfile: appProto.Build.Dockerfile,
		CommitSHA:  appProto.Build.CommitSha,
	}

	agent, err := c.GetAgent(r, cluster, "")
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error getting agent")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	deploymentTarget, err := deployment_target.DeploymentTargetDetails(ctx, deployment_target.DeploymentTargetDetailsInput{
		ProjectID:          int64(project.ID),
		ClusterID:          int64(cluster.ID),
		DeploymentTargetID: revision.DeploymentTargetID,
		CCPClient:          c.Config().ClusterControlPlaneClient,
	})
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error getting deployment target details")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	envFromProtoInp := porter_app.AppEnvironmentFromProtoInput{
		ProjectID:        project.ID,
		ClusterID:        int(cluster.ID),
		DeploymentTarget: deploymentTarget,
		App:              appProto,
		K8SAgent:         agent,
	}
	envGroups, err := porter_app.AppEnvironmentFromProto(ctx, envFromProtoInp)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error getting app environment from revision")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	buildEnvVariables := make(map[string]string)
	for _, envGroup := range envGroups {
		for key, val := range envGroup.Variables {
			buildEnvVariables[key] = val
		}
	}
	resp.BuildEnvVariables = buildEnvVariables

	c.WriteResult(w, r, resp)
}
