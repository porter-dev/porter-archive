package analytics

type SegmentEvent string

const (
	// onboarding flow
	UserCreate      SegmentEvent = "New User"
	UserVerifyEmail SegmentEvent = "User Verified Email"
	ProjectCreate   SegmentEvent = "New Project Event"
	ProjectConnect  SegmentEvent = "Project Connected to Sandbox"
	ProjectDelete   SegmentEvent = "Project Deleted"
	ClusterDelete   SegmentEvent = "Cluster Deleted"

	CostConsentOpened           SegmentEvent = "Cost Consent Opened"
	CostConsentComplete         SegmentEvent = "Cost Consent Complete"
	CredentialStepComplete      SegmentEvent = "Credential Step Complete"
	PreProvisionCheck           SegmentEvent = "Pre Provision Check Started"
	AWSInputted                 SegmentEvent = "AWS Account ID Inputted"
	AWSCloudformationRedirect   SegmentEvent = "AWS Cloudformation Redirect"
	AWSLoginRedirect            SegmentEvent = "AWS Login Redirect"
	AWSCreateIntegrationSuccess SegmentEvent = "AWS Create Integration Success"
	AWSCreateIntegrationFailure SegmentEvent = "AWS Create Integration Failure"
	QuotaIncreaseRequested      SegmentEvent = "AWS Quota Increase Requested"
	ProvisioningAttempted       SegmentEvent = "Provisioning Attempted"
	ProvisioningFailure         SegmentEvent = "Provisioning Failure"

	ClusterProvisioningStart   SegmentEvent = "Cluster Provisioning Started"
	ClusterProvisioningError   SegmentEvent = "Cluster Provisioning Error"
	ClusterProvisioningSuccess SegmentEvent = "Cluster Provisioning Success"

	RegistryProvisioningStart   SegmentEvent = "Registry Provisioning Started"
	RegistryProvisioningError   SegmentEvent = "Registry Provisioning Error"
	RegistryProvisioningSuccess SegmentEvent = "Registry Provisioning Success"

	ClusterConnectionStart   SegmentEvent = "Cluster Connection Started"
	ClusterConnectionSuccess SegmentEvent = "Cluster Connection Success"

	RegistryConnectionStart   SegmentEvent = "Registry Connection Started"
	RegistryConnectionSuccess SegmentEvent = "Registry Connection Success"

	GithubConnectionStart   SegmentEvent = "Github Connection Started"
	GithubConnectionSuccess SegmentEvent = "Github Connection Success"

	// launch flow
	ApplicationLaunchStart   SegmentEvent = "Application Launch Started"
	ApplicationLaunchSuccess SegmentEvent = "Application Launch Success"

	ApplicationDeploymentWebhook SegmentEvent = "Triggered Re-deploy via Webhook"

	// delete events
	ClusterDestroyingStart   SegmentEvent = "Cluster Destroying Start"
	ClusterDestroyingSuccess SegmentEvent = "Cluster Destroying Success"

	// porter apps
	StackLaunchStart      SegmentEvent = "Stack Launch Started"
	StackLaunchComplete   SegmentEvent = "Stack Launch Complete"
	StackLaunchSuccess    SegmentEvent = "Stack Launch Success"
	StackLaunchFailure    SegmentEvent = "Stack Launch Failure"
	StackDeletion         SegmentEvent = "Stack Deletion"
	StackBuildProgressing SegmentEvent = "Stack Build Progressing"
	StackBuildFailure     SegmentEvent = "Stack Build Failure"
	StackBuildSuccess     SegmentEvent = "Stack Build Success"

	PorterAppUpdateFailure SegmentEvent = "Porter App Update Failure"

	// billing

	PaymentMethodAttached  SegmentEvent = "Credit Card Linked"
	PaymentMethodDettached SegmentEvent = "Credit Card Removed"

	// new infra flow

	// CloudProviderPermissionsGranted is a segment event that is triggered when a user grants cloud provider permissions
	CloudProviderPermissionsGranted SegmentEvent = "Cloud Provider Permissions Granted"
	// ClusterPreflightChecksFailed is a segment event that is triggered when a user's cluster fails preflight checks
	ClusterPreflightChecksFailed SegmentEvent = "Cluster Preflight Checks Failed"
	// ClusterUpdateFailed is a segment event that is triggered when a user's cluster update fails
	ClusterUpdateFailed SegmentEvent = "Cluster Update Failed"
)
