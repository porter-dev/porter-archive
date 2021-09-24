package analytics

import (
	"github.com/porter-dev/porter/api/types"
	segment "gopkg.in/segmentio/analytics-go.v3"
)

type segmentTrack interface {
	getUserId() string
	getEvent() SegmentEvent
	getProperties() segment.Properties
}

type defaultTrackOpts struct {
	AdditionalProps map[string]interface{}
}

type defaultSegmentTrack struct {
	event      SegmentEvent
	properties segmentProperties
}

func getDefaultSegmentTrack(additionalProps map[string]interface{}, event SegmentEvent) *defaultSegmentTrack {
	props := newSegmentProperties()
	props.addAdditionalProperties(additionalProps)

	return &defaultSegmentTrack{
		event:      event,
		properties: props,
	}
}

func (t *defaultSegmentTrack) getEvent() SegmentEvent {
	return t.event
}

func (t *defaultSegmentTrack) getProperties() segment.Properties {
	props := segment.NewProperties()

	for key, val := range t.properties {
		props = props.Set(key, val)
	}

	return props
}

type segmentProperties map[string]interface{}

func newSegmentProperties() segmentProperties {
	props := make(map[string]interface{})

	return props
}

func (p segmentProperties) addProjectProperties(opts *ProjectScopedTrackOpts) {
	p["proj_id"] = opts.ProjectID
}

func (p segmentProperties) addClusterProperties(opts *ClusterScopedTrackOpts) {
	p["cluster_id"] = opts.ClusterID
}

func (p segmentProperties) addRegistryProperties(opts *RegistryScopedTrackOpts) {
	p["registry_id"] = opts.RegistryID
}

func (p segmentProperties) addApplicationProperties(opts *ApplicationScopedTrackOpts) {
	p["app_name"] = opts.Name
	p["app_namespace"] = opts.Namespace
	p["chart_name"] = opts.ChartName
}

func (p segmentProperties) addAdditionalProperties(props map[string]interface{}) {
	for key, val := range props {
		p[key] = val
	}
}

// UserCreateTrackOpts are the options for creating a track when a user is created
type UserCreateTrackOpts struct {
	*UserScopedTrackOpts

	Email string
}

// UserCreateTrack returns a track for when a user is created
func UserCreateTrack(opts *UserCreateTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["email"] = opts.Email

	return getSegmentUserTrack(
		opts.UserScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, UserCreate),
	)
}

// UserCreateTrackOpts are the options for creating a track when a user's email is verified
type UserVerifyEmailTrackOpts struct {
	*UserScopedTrackOpts

	Email string
}

// UserVerifyEmailTrack returns a track for when a user's email is verified
func UserVerifyEmailTrack(opts *UserVerifyEmailTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["email"] = opts.Email

	return getSegmentUserTrack(
		opts.UserScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, UserVerifyEmail),
	)
}

// ProjectCreateTrackOpts are the options for creating a track when a project is created
type ProjectCreateTrackOpts struct {
	*ProjectScopedTrackOpts
}

// ProjectCreateTrack returns a track for when a project is created
func ProjectCreateTrack(opts *ProjectCreateTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})

	return getSegmentProjectTrack(
		opts.ProjectScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, ProjectCreate),
	)
}

// ClusterProvisioningStartTrackOpts are the options for creating a track when a cluster
// has started provisioning
type ClusterProvisioningStartTrackOpts struct {
	// note that this is a project-scoped track, since the cluster has not been created yet
	*ProjectScopedTrackOpts

	ClusterType types.InfraKind
	InfraID     uint
}

// ClusterProvisioningStartTrack returns a track for when a cluster
// has started provisioning
func ClusterProvisioningStartTrack(opts *ClusterProvisioningStartTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["cluster_type"] = opts.ClusterType
	additionalProps["infra_id"] = opts.InfraID

	return getSegmentProjectTrack(
		opts.ProjectScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, ClusterProvisioningStart),
	)
}

// ClusterProvisioningErrorTrackOpts are the options for creating a track when a cluster
// has experienced a provisioning error
type ClusterProvisioningErrorTrackOpts struct {
	// note that this is a project-scoped track, since the cluster has not been created yet
	*ProjectScopedTrackOpts

	ClusterType types.InfraKind
	InfraID     uint
}

// ClusterProvisioningErrorTrack returns a track for when a cluster
// has experienced a provisioning error
func ClusterProvisioningErrorTrack(opts *ClusterProvisioningErrorTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["cluster_type"] = opts.ClusterType
	additionalProps["infra_id"] = opts.InfraID

	return getSegmentProjectTrack(
		opts.ProjectScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, ClusterProvisioningError),
	)
}

// ClusterProvisioningSuccessTrackOpts are the options for creating a track when a cluster
// has successfully provisioned
type ClusterProvisioningSuccessTrackOpts struct {
	*ClusterScopedTrackOpts

	ClusterType types.InfraKind
	InfraID     uint
}

// ClusterProvisioningSuccessTrack returns a new track for when a cluster
// has successfully provisioned
func ClusterProvisioningSuccessTrack(opts *ClusterProvisioningSuccessTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["cluster_type"] = opts.ClusterType
	additionalProps["infra_id"] = opts.InfraID

	return getSegmentClusterTrack(
		opts.ClusterScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, ClusterProvisioningSuccess),
	)
}

// ClusterConnectionStartTrackOpts are the options for creating a track when a cluster
// connection has started
type ClusterConnectionStartTrackOpts struct {
	// note that this is a project-scoped track, since the cluster has not been created yet
	*ProjectScopedTrackOpts

	ClusterCandidateID uint
}

// ClusterConnectionStartTrack returns a new track for when a cluster
// connection has started
func ClusterConnectionStartTrack(opts *ClusterConnectionStartTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["cc_id"] = opts.ClusterCandidateID

	return getSegmentProjectTrack(
		opts.ProjectScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, ClusterConnectionStart),
	)
}

// ClusterConnectionSuccessTrackOpts are the options for creating a track when a cluster
// connection has finished
type ClusterConnectionSuccessTrackOpts struct {
	*ClusterScopedTrackOpts

	ClusterCandidateID uint
}

// ClusterConnectionSuccessTrack returns a new track for when a cluster
// connection has finished
func ClusterConnectionSuccessTrack(opts *ClusterConnectionSuccessTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["cc_id"] = opts.ClusterCandidateID

	return getSegmentClusterTrack(
		opts.ClusterScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, ClusterConnectionSuccess),
	)
}

// RegistryConnectionStartTrackOpts are the options for creating a track when a registry
// connection has started
type RegistryConnectionStartTrackOpts struct {
	// note that this is a project-scoped track, since the cluster has not been created yet
	*ProjectScopedTrackOpts

	// a random id assigned to this connection request
	FlowID string
}

// RegistryConnectionStartTrack returns a new track for when a registry
// connection has started
func RegistryConnectionStartTrack(opts *RegistryConnectionStartTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["flow_id"] = opts.FlowID

	return getSegmentProjectTrack(
		opts.ProjectScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, RegistryConnectionStart),
	)
}

// RegistryConnectionSuccessTrackOpts are the options for creating a track when a registry
// connection has completed
type RegistryConnectionSuccessTrackOpts struct {
	*RegistryScopedTrackOpts

	// a random id assigned to this connection request
	FlowID string
}

// RegistryConnectionSuccessTrack returns a new track for when a registry
// connection has completed
func RegistryConnectionSuccessTrack(opts *RegistryConnectionSuccessTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["flow_id"] = opts.FlowID

	return getSegmentRegistryTrack(
		opts.RegistryScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, RegistryConnectionSuccess),
	)
}

// GithubConnectionStartTrackOpts are the options for creating a track when a github account
// connection has started
type GithubConnectionStartTrackOpts struct {
	// note that this is a user-scoped track, since github repos are tied to the user
	*UserScopedTrackOpts
}

// GithubConnectionStartTrack returns a new track for when a github account
// connection has started
func GithubConnectionStartTrack(opts *GithubConnectionStartTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})

	return getSegmentUserTrack(
		opts.UserScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, GithubConnectionStart),
	)
}

// GithubConnectionSuccessTrackOpts are the options for creating a track when a github account
// connection has completed
type GithubConnectionSuccessTrackOpts struct {
	// note that this is a user-scoped track, since github repos are tied to the user
	*UserScopedTrackOpts
}

// GithubConnectionSuccessTrack returns a new track when a github account
// connection has completed
func GithubConnectionSuccessTrack(opts *GithubConnectionSuccessTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})

	return getSegmentUserTrack(
		opts.UserScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, GithubConnectionSuccess),
	)
}

// ApplicationLaunchStartTrackOpts are the options for creating a track when an application
// launch has started
type ApplicationLaunchStartTrackOpts struct {
	*ClusterScopedTrackOpts

	FlowID string
}

// ApplicationLaunchStartTrack returns a new track for when an application
// launch has started
func ApplicationLaunchStartTrack(opts *ApplicationLaunchStartTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["flow_id"] = opts.FlowID

	return getSegmentClusterTrack(
		opts.ClusterScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, ApplicationLaunchStart),
	)
}

// ApplicationLaunchSuccessTrackOpts are the options for creating a track when an application
// launch has completed
type ApplicationLaunchSuccessTrackOpts struct {
	*ApplicationScopedTrackOpts

	FlowID string
}

// ApplicationLaunchSuccessTrack returns a new track for when an application
// launch has completed
func ApplicationLaunchSuccessTrack(opts *ApplicationLaunchSuccessTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["flow_id"] = opts.FlowID

	return getSegmentApplicationTrack(
		opts.ApplicationScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, ApplicationLaunchSuccess),
	)
}

// ApplicationDeploymentWebhookTrackOpts are the options for creating a track when an application
// launch has completed from a webhook
type ApplicationDeploymentWebhookTrackOpts struct {
	*ApplicationScopedTrackOpts

	ImageURI string
}

// ApplicationDeploymentWebhookTrack returns a new track for when an application
// launch has completed from a webhook
func ApplicationDeploymentWebhookTrack(opts *ApplicationDeploymentWebhookTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["image_uri"] = opts.ImageURI

	return getSegmentApplicationTrack(
		opts.ApplicationScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, ApplicationDeploymentWebhook),
	)
}

// RegistryProvisioningStartTrackOpts are the options for creating a track when a registry
// provisioning has started
type RegistryProvisioningStartTrackOpts struct {
	// note that this is a project-scoped track, since the registry has not been created yet
	*ProjectScopedTrackOpts

	RegistryType types.InfraKind
	InfraID      uint
}

// RegistryProvisioningStartTrack returns a new track for when a registry
// provisioning has started
func RegistryProvisioningStartTrack(opts *RegistryProvisioningStartTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["registry_type"] = opts.RegistryType
	additionalProps["infra_id"] = opts.InfraID

	return getSegmentProjectTrack(
		opts.ProjectScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, RegistryProvisioningStart),
	)
}

// RegistryProvisioningErrorTrackOpts are the options for creating a track when a registry
// provisioning has failed
type RegistryProvisioningErrorTrackOpts struct {
	// note that this is a project-scoped track, since the registry has not been created yet
	*ProjectScopedTrackOpts

	RegistryType types.InfraKind
	InfraID      uint
}

// RegistryProvisioningErrorTrack returns a new track for when a registry
// provisioning has failed
func RegistryProvisioningErrorTrack(opts *RegistryProvisioningErrorTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["registry_type"] = opts.RegistryType
	additionalProps["infra_id"] = opts.InfraID

	return getSegmentProjectTrack(
		opts.ProjectScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, RegistryProvisioningError),
	)
}

// RegistryProvisioningSuccessTrackOpts are the options for creating a track when a registry
// provisioning has completed
type RegistryProvisioningSuccessTrackOpts struct {
	*RegistryScopedTrackOpts

	RegistryType types.InfraKind
	InfraID      uint
}

// RegistryProvisioningSuccessTrack returns a new track for when a registry
// provisioning has completed
func RegistryProvisioningSuccessTrack(opts *RegistryProvisioningSuccessTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["registry_type"] = opts.RegistryType
	additionalProps["infra_id"] = opts.InfraID

	return getSegmentRegistryTrack(
		opts.RegistryScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, RegistryProvisioningSuccess),
	)
}

// ClusterDestroyingStartTrackOpts are the options for creating a track when a cluster
// has started destroying
type ClusterDestroyingStartTrackOpts struct {
	*ClusterScopedTrackOpts

	ClusterType types.InfraKind
	InfraID     uint
}

// ClusterDestroyingStartTrack returns a track for when a cluster
// has started destroying
func ClusterDestroyingStartTrack(opts *ClusterDestroyingStartTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["cluster_type"] = opts.ClusterType
	additionalProps["infra_id"] = opts.InfraID

	return getSegmentClusterTrack(
		opts.ClusterScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, ClusterDestroyingStart),
	)
}

// ClusterDestroyingSuccessTrackOpts are the options for creating a track when a cluster
// has successfully provisioned
type ClusterDestroyingSuccessTrackOpts struct {
	*ClusterScopedTrackOpts

	ClusterType types.InfraKind
	InfraID     uint
}

// ClusterDestroyingSuccessTrack returns a new track for when a cluster
// has successfully provisioned
func ClusterDestroyingSuccessTrack(opts *ClusterDestroyingSuccessTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["cluster_type"] = opts.ClusterType
	additionalProps["infra_id"] = opts.InfraID

	return getSegmentClusterTrack(
		opts.ClusterScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, ClusterDestroyingSuccess),
	)
}
