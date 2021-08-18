package analytics

type SegmentEvent string

const (
	// onboarding flow
	UserCreate    SegmentEvent = "New User"
	ProjectCreate SegmentEvent = "New Project Event"

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
	ApplicationLaunch            SegmentEvent = "New Application Launched"
	ApplicationLaunchError       SegmentEvent = "Application Deployment Error"
	ApplicationDeploymentWebhook SegmentEvent = "Triggered Re-deploy via Webhook"
)
