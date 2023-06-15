package analytics

type SegmentEvent string

const (
	// onboarding flow
	UserCreate      SegmentEvent = "New User"
	UserVerifyEmail SegmentEvent = "User Verified Email"
	ProjectCreate   SegmentEvent = "New Project Event"

	CostConsentOpened      SegmentEvent = "Cost Consent Opened"
	CostConsentComplete    SegmentEvent = "Cost Consent Complete"
	CredentialStepComplete SegmentEvent = "Credential Step Complete"
	PreProvisionCheck      SegmentEvent = "Pre Provision Check Started"
	ProvisioningAttempted  SegmentEvent = "Provisioning Attempted"

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

	// stacks
	StackLaunchStart    SegmentEvent = "Stack Launch Started"
	StackLaunchComplete SegmentEvent = "Stack Launch Complete"
	StackLaunchSuccess  SegmentEvent = "Stack Launch Success"
)
