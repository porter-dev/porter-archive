package types

type CreateStackReleaseRequest struct {
	StackName        string    `json:"stack_name" form:"required,dns1123"`
	PorterYAMLBase64 string    `json:"porter_yaml" form:"required"`
	ImageInfo        ImageInfo `json:"image_info" form:"omitempty"`
}

type ImageInfo struct {
	Repository string `json:"repository"`
	Tag        string `json:"tag"`
}

type CreateSecretAndOpenGHPRRequest struct {
	GithubAppInstallationID  int64  `json:"github_app_installation_id" form:"required"`
	GithubRepoOwner          string `json:"github_repo_owner" form:"required"`
	GithubRepoName           string `json:"github_repo_name" form:"required"`
	OpenPr                   bool   `json:"open_pr"`
	Branch                   string `json:"branch"`
	PorterYamlPath           string `json:"porter_yaml_path"`
	DeleteWorkflowFilename   string `json:"delete_workflow_filename"`
	PreviewsWorkflowFilename string `json:"previews_workflow_filename"`
	DeploymentTargetId       string `json:"deployment_target_id"`
}

type CreateSecretAndOpenGHPRResponse struct {
	URL string `json:"url"`
}

type GetStackResponse PorterApp

type PorterAppAnalyticsRequest struct {
	Step               string `json:"step" form:"required,max=255"`
	StackName          string `json:"stack_name"`
	ErrorMessage       string `json:"error_message"`
	ErrorStackTrace    string `json:"error_stack_trace"`
	DeleteWorkflowFile bool   `json:"delete_workflow_file"`
}
