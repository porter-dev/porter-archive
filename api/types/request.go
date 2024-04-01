package types

type APIVerb string

const (
	APIVerbGet    APIVerb = "get"
	APIVerbCreate APIVerb = "create"
	APIVerbList   APIVerb = "list"
	APIVerbUpdate APIVerb = "update"
	APIVerbDelete APIVerb = "delete"
)

type APIVerbGroup []APIVerb

func ReadVerbGroup() APIVerbGroup {
	return []APIVerb{APIVerbGet, APIVerbList}
}

func ReadWriteVerbGroup() APIVerbGroup {
	return []APIVerb{APIVerbGet, APIVerbList, APIVerbCreate, APIVerbUpdate, APIVerbDelete}
}

type HTTPVerb string

const (
	HTTPVerbGet    HTTPVerb = "GET"
	HTTPVerbPost   HTTPVerb = "POST"
	HTTPVerbPut    HTTPVerb = "PUT"
	HTTPVerbPatch  HTTPVerb = "PATCH"
	HTTPVerbDelete HTTPVerb = "DELETE"
)

type URLParam string

const (
	URLParamProjectID             URLParam = "project_id"
	URLParamClusterID             URLParam = "cluster_id"
	URLParamRegistryID            URLParam = "registry_id"
	URLParamHelmRepoID            URLParam = "helm_repo_id"
	URLParamGitInstallationID     URLParam = "git_installation_id"
	URLParamInfraID               URLParam = "infra_id"
	URLParamOperationID           URLParam = "operation_id"
	URLParamInviteID              URLParam = "invite_id"
	URLParamNamespace             URLParam = "namespace"
	URLParamReleaseName           URLParam = "name"
	URLParamPorterAppID           URLParam = "porter_app_id"
	URLParamStackID               URLParam = "stack_id"
	URLParamReleaseVersion        URLParam = "version"
	URLParamWildcard              URLParam = "*"
	URLParamIntegrationID         URLParam = "integration_id"
	URLParamAPIContractRevisionID URLParam = "contract_revision_id"
	URLParamStackEventID          URLParam = "stack_event_id"
	URLParamPorterAppName         URLParam = "porter_app_name"
	URLParamPorterAppEventID      URLParam = "porter_app_event_id"
	URLParamAppRevisionID         URLParam = "app_revision_id"
	URLParamDatastoreType         URLParam = "datastore_type"
	URLParamDatastoreName         URLParam = "datastore_name"
	URLParamPaymentMethodID       URLParam = "payment_method_id"
	URLParamNotificationConfigID  URLParam = "notification_config_id"
	URLParamNotificationID        URLParam = "notification_id"
	URLParamCloudProviderType     URLParam = "cloud_provider_type"
	URLParamCloudProviderID       URLParam = "cloud_provider_id"
	URLParamDeploymentTargetID    URLParam = "deployment_target_id"
	// URLParamDeploymentTargetIdentifier can be either the deployment target id or deployment target name
	URLParamDeploymentTargetIdentifier URLParam = "deployment_target_identifier"
	URLParamWebhookID                  URLParam = "webhook_id"
	URLParamJobRunName                 URLParam = "job_run_name"
)

type Path struct {
	Parent       *Path
	RelativePath string
}

type APIRequestMetadata struct {
	Verb           APIVerb
	Method         HTTPVerb
	Path           *Path
	Scopes         []PermissionScope
	ShouldRedirect bool

	// Whether the endpoint should log
	Quiet bool

	// Whether the endpoint upgrades to a websocket
	IsWebsocket bool

	// Whether the endpoint should check for a usage limit
	CheckUsage bool

	// The usage metric that the request should check for, if CheckUsage
	UsageMetric UsageMetric
}

const RequestScopeCtxKey = "requestscopes"

type RequestAction struct {
	Verb     APIVerb
	Resource NameOrUInt
}

var RequestCtxWebsocketKey = "websocket"
