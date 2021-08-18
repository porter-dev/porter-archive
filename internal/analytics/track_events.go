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

	ClusterConnectedStart   SegmentEvent = "Cluster Connection Started"
	ClusterConnectedError   SegmentEvent = "Cluster Connection Started"
	ClusterConnectedSuccess SegmentEvent = "Cluster Connection Error"

	RegistryConnectedSuccess SegmentEvent = "Registry Connection Success"
	RegistryConnectedError   SegmentEvent = "Registry Connection Error"

	GithubConnectedSuccess SegmentEvent = "Github Connection Success"
	GithubConnectedError   SegmentEvent = "Github Connection Error"

	// launch flow
	ApplicationLaunch            SegmentEvent = "New Application Launched"
	ApplicationLaunchError       SegmentEvent = "Application Deployment Error"
	ApplicationDeploymentWebhook SegmentEvent = "Triggered Re-deploy via Webhook"
)
