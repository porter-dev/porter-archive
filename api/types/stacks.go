package types

import "time"

// swagger:model
type CreateStackRequest struct {
	// The display name of the stack
	// required: true
	Name string `json:"name" form:"required"`

	// A list of app resources to create. An app resource is an application helm chart, such as a `web` or `worker` template.
	// required: true
	AppResources []*CreateStackAppResourceRequest `json:"app_resources,omitempty" form:"required,dive,required"`

	// A list of configurations which can build an application. Each application resource must use at least one
	// source config in order to build application from source. The source config can be specified as a Docker image
	// registry or linked to a remote Git repository.
	// required: true
	SourceConfigs []*CreateStackSourceConfigRequest `json:"source_configs,omitempty" form:"required,dive,required"`

	// A list of env groups which can be synced to an application
	EnvGroups []*CreateStackEnvGroupRequest `json:"env_groups,omitempty" form:"required,dive,required"`
}

// swagger:model
type PutStackSourceConfigRequest struct {
	SourceConfigs []*CreateStackSourceConfigRequest `json:"source_configs,omitempty" form:"required,dive,required"`
}

const URLParamStackRevisionNumber URLParam = "stack_revision_number"

// swagger:model
type StackRollbackRequest struct {
	TargetRevision uint `json:"target_revision"`
}

// swagger:model
type PatchStackSourceConfigRequest struct {
	SourceConfig *UpdateStackSourceConfigRequest `json:"source_config,omitempty" form:"required"`
}

type CreateStackAppResourceRequest struct {
	// The URL of the Helm registry to pull the template from. If not set, this defaults to `https://charts.getporter.dev`.
	TemplateRepoURL string `json:"template_repo_url"`

	// The name of the template in the Helm registry, such as `web`
	// required: true
	TemplateName string `json:"template_name" form:"required"`

	// The version of the template in the Helm registry, such as `v0.50.0`
	// required: true
	TemplateVersion string `json:"template_version" form:"required"`

	// The values to pass in to the template.
	Values map[string]interface{} `json:"values"`

	// The name of the resource.
	// required: true
	Name string `json:"name" form:"required,dns1123"`

	// The name of the source config (must exist inside `source_configs`).
	// required: true
	SourceConfigName string `json:"source_config_name" form:"required"`
}

// swagger:model
type UpdateStackRequest struct {
	Name string `json:"name" form:"required"`
}

// swagger:model
type Stack struct {
	// The time that the stack was initially created
	CreatedAt time.Time `json:"created_at"`

	// The time that the stack was last updated
	UpdatedAt time.Time `json:"updated_at"`

	// The display name of the stack
	Name string `json:"name"`

	// The namespace that the stack was deployed to
	Namespace string `json:"namespace"`

	// A unique id for the stack
	ID string `json:"id"`

	// The latest revision for the stack
	LatestRevision *StackRevision `json:"latest_revision,omitempty"`

	// The list of revisions deployed for this stack
	Revisions []StackRevisionMeta `json:"revisions,omitempty"`
}

// swagger:model
type ListStackRevisionsResponse []StackRevision

// swagger:model
type StackListResponse []Stack

type StackResource struct {
	// The time that this resource was initially created
	CreatedAt time.Time `json:"created_at"`

	// The time that this resource was last updated
	UpdatedAt time.Time `json:"updated_at"`

	// The stack ID that this resource belongs to
	StackID string `json:"stack_id"`

	// The numerical revision id that this resource belongs to
	StackRevisionID uint `json:"stack_revision_id"`

	// The name of the resource
	Name string `json:"name"`

	// The id for this resource
	ID string `json:"id"`

	// If this is an app resource, app-specific information for the resource
	StackAppData *StackResourceAppData `json:"stack_app_data,omitempty"`

	// The source configuration that this resource uses, if this is an application resource
	StackSourceConfig *StackSourceConfig `json:"stack_source_config,omitempty"`
}

type StackResourceAppData struct {
	// The URL of the Helm registry to pull the template from
	TemplateRepoURL string `json:"template_repo_url"`

	// The name of the template in the Helm registry, such as `web`
	TemplateName string `json:"template_name"`

	// The version of the template in the Helm registry, such as `v0.50.0`
	TemplateVersion string `json:"template_version"`
}

type StackRevisionStatus string

const (
	StackRevisionStatusDeploying StackRevisionStatus = "deploying"
	StackRevisionStatusFailed    StackRevisionStatus = "failed"
	StackRevisionStatusDeployed  StackRevisionStatus = "deployed"
)

type StackRevisionMeta struct {
	// The time that this revision was created
	CreatedAt time.Time `json:"created_at"`

	// The id of the revision
	ID uint `json:"id"`

	// The status of the revision
	Status StackRevisionStatus `json:"status"`

	// The stack ID that this source config belongs to
	StackID string `json:"stack_id"`
}

type StackRevision struct {
	*StackRevisionMeta

	// The reason for any error or status change
	Reason string `json:"reason"`

	// The message associated with an error or status change
	Message string `json:"message"`

	// The list of resources deployed in this revision
	Resources []StackResource `json:"resources"`

	// The list of source configs deployed in this revision
	SourceConfigs []StackSourceConfig `json:"source_configs"`

	// The list of env groups scoped to this stack
	EnvGroups []StackEnvGroup `json:"env_groups"`
}

type StackEnvGroup struct {
	// The time that this resource was initially created
	CreatedAt time.Time `json:"created_at"`

	// The time that this resource was last updated
	UpdatedAt time.Time `json:"updated_at"`

	// The stack ID that this resource belongs to
	StackID string `json:"stack_id"`

	// The numerical revision id that this resource belongs to
	StackRevisionID uint `json:"stack_revision_id"`

	// The name of the resource
	Name string `json:"name"`

	// The id for this resource
	ID string `json:"id"`

	// The version of the env group which is being used
	EnvGroupVersion uint `json:"env_group_version"`
}

type StackSourceConfig struct {
	// The time that the source configuration was initially created
	CreatedAt time.Time `json:"created_at"`

	// The time that the source configuration was last updated
	UpdatedAt time.Time `json:"updated_at"`

	// The stack ID that this source config belongs to
	StackID string `json:"stack_id"`

	// The numerical revision id that this source config belongs to
	StackRevisionID uint `json:"stack_revision_id"`

	// Unique name for the source config
	Name string `json:"name"`

	// Display name for the stack source
	DisplayName string `json:"display_name"`

	// The unique id of the stack source config
	ID string `json:"id"`

	// The complete image repo uri used by the source
	ImageRepoURI string `json:"image_repo_uri"`

	// The current image tag used by the application
	ImageTag string `json:"image_tag"`

	// If this field is empty, the resource is deployed directly from the image repo uri
	StackSourceConfigBuild *StackSourceConfigBuild `json:"build,omitempty"`
}

// swagger:model
type CreateStackEnvGroupRequest struct {
	// The name of the env group
	// required: true
	Name string `json:"name" form:"required,dns1123"`

	// The non-secret variables to set in the env group
	// required: true
	Variables map[string]string `json:"variables" form:"required"`

	// The secret variables to set in the env group
	// required: true
	SecretVariables map[string]string `json:"secret_variables" form:"required"`

	// The list of applications that this env group should be synced to. These applications **must** be present
	// in the stack - if an env group is created from a stack, syncing to applications which are not in the stack
	// is not supported
	LinkedApplications []string `json:"linked_applications"`
}

// swagger:model
type CreateStackSourceConfigRequest struct {
	// required: true
	DisplayName string `json:"display_name" form:"required"`

	// required: true
	Name string `json:"name" form:"required"`

	// required: true
	ImageRepoURI string `json:"image_repo_uri" form:"required"`

	// required: true
	ImageTag string `json:"image_tag" form:"required"`

	// If this field is empty, the resource is deployed directly from the image repo uri
	StackSourceConfigBuild *StackSourceConfigBuild `json:"build,omitempty"`
}

// swagger:model
type UpdateStackSourceConfigRequest struct {
	// required: true
	Name string `json:"name" form:"required"`

	// required: true
	ImageRepoURI string `json:"image_repo_uri" form:"required"`

	// required: true
	ImageTag string `json:"image_tag" form:"required"`
}

type StackSourceConfigBuild struct {
	// The build method to use: can be `docker` (for dockerfiles), or `pack` (for buildpacks)
	// required: true
	Method string `json:"method" form:"required"`

	// The path to the build context (the root folder of the application). For example, `.` or `./app`
	// required: true
	FolderPath string `json:"folder_path" form:"required"`

	// The remote Git configuration to use. If not passed in, this application will not appear to be linked to a
	// remote Git repository.
	StackSourceConfigBuildGit *StackSourceConfigBuildGit `json:"git,omitempty"`

	// The Dockerfile build configuration, if `method` is `docker`
	StackSourceConfigBuildDockerfile *StackSourceConfigBuildDockerfile `json:"dockerfile,omitempty"`

	// The buildpack configuration, if method is `pack`
	StackSourceConfigBuildPack *StackSourceConfigBuildPack `json:"buildpack,omitempty"`
}

type StackSourceConfigBuildGit struct {
	// The git integration kind: can be `github` or `gitlab`
	GitIntegrationKind string `json:"git_integration_kind"`

	// The integration id of the github or gitlab integration
	GitIntegrationID uint `json:"git_integration_id"`

	// The git repo in ${owner}/${repo} form
	GitRepo string `json:"git_repo"`

	// The git branch to use
	GitBranch string `json:"git_branch"`
}

type StackSourceConfigBuildDockerfile struct {
	// The path to the dockerfile from the root directory. Defaults to `./Dockerfile`.
	DockerfilePath string `json:"dockerfile_path" form:"required"`
}

type StackSourceConfigBuildPack struct {
	// The buildpack builder to use
	// required: true
	Builder string `json:"builder" form:"required"`

	// A list of buildpacks to use
	Buildpacks []string `json:"buildpacks"`
}
