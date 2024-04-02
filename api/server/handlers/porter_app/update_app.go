package porter_app

import (
	"context"
	"encoding/base64"
	"net/http"

	"connectrpc.com/connect"
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
	v2 "github.com/porter-dev/porter/internal/porter_app/v2"
	"github.com/porter-dev/porter/internal/telemetry"
)

// UpdateAppHandler is the handler for the POST /apps/update endpoint
type UpdateAppHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

// NewUpdateAppHandler handles POST requests to the endpoint POST /apps/update
func NewUpdateAppHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *UpdateAppHandler {
	return &UpdateAppHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

// ServiceDeletions are deletions to apply to a specific service
type ServiceDeletions struct {
	DomainNames           []string `json:"domain_names"`
	IngressAnnotationKeys []string `json:"ingress_annotation_keys"`
}

// EnvVariableDeletions is the set of keys to delete from the environment group
type EnvVariableDeletions struct {
	// Variables is a set of variable keys to delete from the environment group
	Variables []string `json:"variables"`
	// Secrets is a set of secret variable keys to delete from the environment group
	Secrets []string `json:"secrets"`
}

// Deletions are the names of services and env variables to delete
type Deletions struct {
	ServiceNames         []string                    `json:"service_names"`
	Predeploy            []string                    `json:"predeploy"`
	EnvGroupNames        []string                    `json:"env_group_names"`
	ServiceDeletions     map[string]ServiceDeletions `json:"service_deletions"`
	EnvVariableDeletions EnvVariableDeletions        `json:"env_variable_deletions"`
}

// UpdateAppRequest is the request object for the POST /apps/update endpoint
type UpdateAppRequest struct {
	// Name is the name of the app to update. If not specified, the name will be inferred from the porter yaml
	Name string `json:"name"`
	// GitSource is the git source configuration for the app, if applicable
	GitSource GitSource `json:"git_source,omitempty"`
	// DeploymentTargetId is the ID of the deployment target to apply the update to
	DeploymentTargetId string `json:"deployment_target_id"`
	// DeploymentTargetName is the name of the deployment target to apply the update to
	DeploymentTargetName string `json:"deployment_target_name"`
	// Variables is a map of environment variable names to values
	Variables map[string]string `json:"variables"`
	// Secrets is a map of secret names to values
	Secrets map[string]string `json:"secrets"`
	// Deletions is the set of fields to delete before applying the update
	Deletions Deletions `json:"deletions"`
	// CommitSHA is the commit sha of the git commit that triggered this update, indicating a source change and triggering a build
	CommitSHA string `json:"commit_sha"`
	// ImageTagOverride is the image tag to override the image tag in the porter.yaml (it will override the image tag in the porter.yaml if specified)
	ImageTagOverride string `json:"image_tag_override"`
	// PorterYAMLPath is the path to the porter yaml file in the git repo
	PorterYAMLPath string `json:"porter_yaml_path"`
	// AppRevisionID is the ID of the revision to perform follow up actions on after the initial apply
	AppRevisionID string `json:"app_revision_id"`
	// Only one of Base64AppProto or Base64PorterYAML should be specified
	// Base64AppProto is a ful base64 encoded porter app contract to apply
	Base64AppProto string `json:"b64_app_proto"`
	// Base64AddonProtos is a list of base64 encoded addon contracts to apply along with the app
	Base64AddonProtos []string `json:"b64_addon_protos"`
	// Base64PorterYAML is a base64 encoded porter yaml to apply representing a potentially partial porter app contract
	Base64PorterYAML string `json:"b64_porter_yaml"`
	// PatchOperations is a set of patch operations to apply to the porter.yaml if specified
	PatchOperations []v2.PatchOperation `json:"patch_operations"`
	// IsEnvOverride is used to remove any variables that are not specified in the request.  If false, the request will only update the variables specified in the request,
	// and leave all other variables untouched.
	IsEnvOverride bool `json:"is_env_override"`
	// WithPredeploy is a flag to indicate whether to run the predeploy job
	WithPredeploy bool `json:"with_predeploy"`
	// Exact is a flag to indicate whether to apply the update exactly as specified in the request (default is to merge with existing app)
	Exact bool `json:"exact"`
}

// UpdateAppResponse is the response object for the POST /apps/update endpoint
type UpdateAppResponse struct {
	AppName       string `json:"app_name"`
	AppRevisionId string `json:"app_revision_id"`
}

// ServeHTTP translates the request into an UpdateApp request, forwards to the cluster control plane, and returns the response
func (c *UpdateAppHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-update-app")
	defer span.End()

	project, _ := ctx.Value(types.ProjectScope).(*models.Project)
	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)

	request := &UpdateAppRequest{}
	if ok := c.DecodeAndValidate(w, r, request); !ok {
		err := telemetry.Error(ctx, span, nil, "error decoding request")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	if request.Base64AppProto != "" && request.Base64PorterYAML != "" {
		err := telemetry.Error(ctx, span, nil, "both b64 yaml and b64 porter yaml are specified")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	deploymentTargetID := request.DeploymentTargetId
	deploymentTargetName := request.DeploymentTargetName
	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "deployment-target-id", Value: deploymentTargetID},
		telemetry.AttributeKV{Key: "deployment-target-name", Value: deploymentTargetName},
	)

	var deploymentTargetIdentifer *porterv1.DeploymentTargetIdentifier
	if deploymentTargetID != "" || deploymentTargetName != "" {
		deploymentTargetIdentifer = &porterv1.DeploymentTargetIdentifier{
			Id:   deploymentTargetID,
			Name: deploymentTargetName,
		}
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "name", Value: request.Name},
		telemetry.AttributeKV{Key: "deployment-target-id", Value: deploymentTargetID},
		telemetry.AttributeKV{Key: "app-revision-id", Value: request.AppRevisionID},
		telemetry.AttributeKV{Key: "commit-sha", Value: request.CommitSHA},
		telemetry.AttributeKV{Key: "porter-yaml-path", Value: request.PorterYAMLPath},
		telemetry.AttributeKV{Key: "is-env-override", Value: request.IsEnvOverride},
		telemetry.AttributeKV{Key: "with-predeploy", Value: request.WithPredeploy},
	)

	var addons, addonOverrides []*porterv1.Addon
	var overrides *porterv1.PorterApp
	appProto := &porterv1.PorterApp{}

	var previewEnvVariables map[string]string
	envVariables := request.Variables

	// get app definition from either base64 yaml or base64 porter app proto
	if request.Base64AppProto != "" {
		decoded, err := base64.StdEncoding.DecodeString(request.Base64AppProto)
		if err != nil {
			err := telemetry.Error(ctx, span, err, "error decoding base yaml")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
			return
		}

		err = helpers.UnmarshalContractObject(decoded, appProto)
		if err != nil {
			err := telemetry.Error(ctx, span, err, "error unmarshalling app proto")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
			return
		}
	}

	for _, b64AddonProto := range request.Base64AddonProtos {
		decoded, err := base64.StdEncoding.DecodeString(b64AddonProto)
		if err != nil {
			err := telemetry.Error(ctx, span, err, "error decoding base yaml")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
			return
		}

		addon := &porterv1.Addon{}
		err = helpers.UnmarshalContractObject(decoded, addon)
		if err != nil {
			err := telemetry.Error(ctx, span, err, "error unmarshalling addon proto")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
			return
		}

		addons = append(addons, addon)
	}

	if request.Base64PorterYAML != "" {
		decoded, err := base64.StdEncoding.DecodeString(request.Base64PorterYAML)
		if err != nil {
			err := telemetry.Error(ctx, span, err, "error decoding base yaml")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
			return
		}

		appFromYaml, err := porter_app.ParseYAML(ctx, decoded, request.Name)
		if err != nil {
			err := telemetry.Error(ctx, span, err, "error parsing yaml")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
			return
		}

		appProto = appFromYaml.AppProto

		// only public variables can be defined in porter.yaml
		envVariables = mergeEnvVariables(request.Variables, appFromYaml.EnvVariables)

		if appFromYaml.PreviewApp != nil {
			overrides = appFromYaml.PreviewApp.AppProto
			addonOverrides = appFromYaml.PreviewApp.Addons
			previewEnvVariables = appFromYaml.PreviewApp.EnvVariables
		}

		addons = appFromYaml.Addons
	}

	if appProto != nil {
		patchedProto, err := v2.PatchApp(ctx, appProto, request.PatchOperations)
		if err != nil {
			err := telemetry.Error(ctx, span, err, "error patching app proto")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}
		appProto = patchedProto
	}

	if appProto.Name == "" {
		if request.Name == "" {
			err := telemetry.Error(ctx, span, nil, "app name is empty")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
			return
		}
		appProto.Name = request.Name
	}

	sourceType, image, err := sourceFromAppAndGitSource(ctx, appProto, request.GitSource)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error getting source from app and git source")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	// create porter app if it doesn't exist for the given name
	_, err = porter_app.CreateOrGetAppRecord(ctx, porter_app.CreateOrGetAppRecordInput{
		ClusterID:           cluster.ID,
		ProjectID:           project.ID,
		Name:                appProto.Name,
		SourceType:          sourceType,
		GitBranch:           request.GitSource.GitBranch,
		GitRepoName:         request.GitSource.GitRepoName,
		GitRepoID:           request.GitSource.GitRepoID,
		PorterYamlPath:      request.PorterYAMLPath,
		Image:               image,
		PorterAppRepository: c.Repo().PorterApp(),
	})
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error creating or getting porter app")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	var serviceDeletions map[string]*porterv1.ServiceDeletions
	if request.Deletions.ServiceDeletions != nil {
		serviceDeletions = make(map[string]*porterv1.ServiceDeletions)
		for k, v := range request.Deletions.ServiceDeletions {
			serviceDeletions[k] = &porterv1.ServiceDeletions{
				DomainNames:        v.DomainNames,
				IngressAnnotations: v.IngressAnnotationKeys,
			}
		}
	}

	if request.ImageTagOverride != "" {
		if appProto.Image == nil {
			appProto.Image = &porterv1.AppImage{}
		}
		appProto.Image.Tag = request.ImageTagOverride
	}

	updateReq := connect.NewRequest(&porterv1.UpdateAppRequest{
		ProjectId:                  int64(project.ID),
		ClusterId:                  int64(cluster.ID),
		DeploymentTargetIdentifier: deploymentTargetIdentifer,
		App:                        appProto,
		AppRevisionId:              request.AppRevisionID,
		AppEnv: &porterv1.EnvGroupVariables{
			Normal: envVariables,
			Secret: request.Secrets,
		},
		AppEnvOverrides: &porterv1.EnvGroupVariables{
			Normal: previewEnvVariables,
		},
		Deletions: &porterv1.Deletions{
			ServiceNames:     request.Deletions.ServiceNames,
			PredeployNames:   request.Deletions.Predeploy,
			EnvGroupNames:    request.Deletions.EnvGroupNames,
			ServiceDeletions: serviceDeletions,
			EnvVariableDeletions: &porterv1.EnvVariableDeletions{
				Variables: request.Deletions.EnvVariableDeletions.Variables,
				Secrets:   request.Deletions.EnvVariableDeletions.Secrets,
			},
		},
		AppOverrides:        overrides,
		CommitSha:           request.CommitSHA,
		IsEnvOverride:       request.IsEnvOverride,
		Addons:              addons,
		AddonOverrides:      addonOverrides,
		IsPredeployEligible: request.WithPredeploy,
		Exact:               request.Exact,
	})

	ccpResp, err := c.Config().ClusterControlPlaneClient.UpdateApp(ctx, updateReq)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error calling ccp update app")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	if ccpResp == nil {
		err := telemetry.Error(ctx, span, err, "ccp resp is nil")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}
	if ccpResp.Msg == nil {
		err := telemetry.Error(ctx, span, err, "ccp resp msg is nil")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	if ccpResp.Msg.AppRevisionId == "" {
		err := telemetry.Error(ctx, span, err, "ccp resp app revision id is empty")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "resp-app-revision-id", Value: ccpResp.Msg.AppRevisionId})

	response := &UpdateAppResponse{
		AppRevisionId: ccpResp.Msg.AppRevisionId,
		AppName:       appProto.Name,
	}

	c.WriteResult(w, r, response)
}

func sourceFromAppAndGitSource(ctx context.Context, appProto *porterv1.PorterApp, gitSource GitSource) (porter_app.SourceType, *porter_app.Image, error) {
	ctx, span := telemetry.NewSpan(ctx, "source-from-app-and-git-source")
	defer span.End()

	var sourceType porter_app.SourceType
	var image *porter_app.Image

	if appProto == nil {
		return sourceType, image, telemetry.Error(ctx, span, nil, "app proto is nil")
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "app-name", Value: appProto.Name},
		telemetry.AttributeKV{Key: "git-repo-id", Value: gitSource.GitRepoID},
		telemetry.AttributeKV{Key: "has-build", Value: appProto.Build != nil},
		telemetry.AttributeKV{Key: "has-image", Value: appProto.Image != nil},
	)

	if appProto.Build != nil {
		if gitSource.GitRepoID == 0 {
			telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "source-type", Value: porter_app.SourceType_Local})

			return porter_app.SourceType_Local, image, nil
		}

		telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "source-type", Value: porter_app.SourceType_Github})
		return porter_app.SourceType_Github, image, nil
	}

	if appProto.Image != nil {
		sourceType = porter_app.SourceType_DockerRegistry
		image = &porter_app.Image{
			Repository: appProto.Image.Repository,
			Tag:        appProto.Image.Tag,
		}
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "source-type", Value: sourceType})

	return sourceType, image, nil
}

func mergeEnvVariables(currentEnv, previousEnv map[string]string) map[string]string {
	env := make(map[string]string)

	for k, v := range previousEnv {
		env[k] = v
	}
	for k, v := range currentEnv {
		env[k] = v
	}

	return env
}
