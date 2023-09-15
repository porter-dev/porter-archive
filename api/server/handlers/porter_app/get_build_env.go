package porter_app

import (
	"encoding/base64"
	"net/http"

	"github.com/porter-dev/api-contracts/generated/go/helpers"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/porter_app"
	"github.com/porter-dev/porter/internal/telemetry"
)

// GetBuildEnvHandler is the handler for the /apps/build-env endpoint
type GetBuildEnvHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

// NewGetBuildEnvHandler handles GET requests to the /apps/build-env endpoint
func NewGetBuildEnvHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *GetBuildEnvHandler {
	return &GetBuildEnvHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

// GetBuildEnvRequest is the request object for the /apps/build-env endpoint
type GetBuildEnvRequest struct {
	Base64AppProto string `json:"b64_app_proto"`
}

// GetBuildEnvResponse is the response object for the /apps/build-env endpoint
type GetBuildEnvResponse struct {
	BuildEnvVariables map[string]string `json:"build_env_variables"`
}

// ServeHTTP translates the request into a GetBuildEnvRequest request, uses the proto to query the cluster for the build env, and returns the response
func (c *GetBuildEnvHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-get-build-env")
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

	request := &ApplyPorterAppRequest{}
	if ok := c.DecodeAndValidate(w, r, request); !ok {
		err := telemetry.Error(ctx, span, nil, "error decoding request")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	if request.Base64AppProto == "" {
		err := telemetry.Error(ctx, span, nil, "app proto is empty")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	decoded, err := base64.StdEncoding.DecodeString(request.Base64AppProto)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error decoding base yaml")
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

	deploymentTargets, err := c.Repo().DeploymentTarget().List(project.ID)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error reading deployment targets")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	if len(deploymentTargets) == 0 {
		err := telemetry.Error(ctx, span, nil, "no deployment targets found")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	if len(deploymentTargets) > 1 {
		err = telemetry.Error(ctx, span, err, "more than one deployment target found")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	deploymentTarget := deploymentTargets[0]

	agent, err := c.GetAgent(r, cluster, "")
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error getting agent")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	envFromProtoInp := porter_app.AppEnvironmentFromProtoInput{
		App:              appProto,
		DeploymentTarget: deploymentTarget,
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

	res := &GetBuildEnvResponse{
		BuildEnvVariables: buildEnvVariables,
	}

	c.WriteResult(w, r, res)
}
