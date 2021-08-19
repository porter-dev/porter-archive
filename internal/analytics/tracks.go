package analytics

import (
	"fmt"

	"github.com/porter-dev/porter/internal/models"
	segment "gopkg.in/segmentio/analytics-go.v3"
)

// TRACK FUNCTIONS
type UserCreateTrackOpts struct {
	*UserScopedTrackOpts
}

func UserCreateTrack(opts *UserCreateTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})

	return getSegmentUserTrack(
		opts.UserScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, UserCreate),
	)
}

type ProjectCreateTrackOpts struct {
	*ProjectScopedTrackOpts
}

func ProjectCreateTrack(opts *ProjectCreateTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})

	return getSegmentProjectTrack(
		opts.ProjectScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, ProjectCreate),
	)
}

type ClusterProvisioningStartTrackOpts struct {
	// note that this is a project-scoped track, since the cluster has not been created yet
	*ProjectScopedTrackOpts

	ClusterType models.InfraKind
	InfraID     uint
}

func ClusterProvisioningStartTrack(opts *ClusterProvisioningStartTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["cluster_type"] = opts.ClusterType
	additionalProps["infra_id"] = opts.InfraID

	return getSegmentProjectTrack(
		opts.ProjectScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, ClusterProvisioningStart),
	)
}

type ClusterProvisioningErrorTrackOpts struct {
	// note that this is a project-scoped track, since the cluster has not been created yet
	*ProjectScopedTrackOpts

	ClusterType models.InfraKind
	InfraID     uint
}

func ClusterProvisioningErrorTrack(opts *ClusterProvisioningErrorTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["cluster_type"] = opts.ClusterType
	additionalProps["infra_id"] = opts.InfraID

	return getSegmentProjectTrack(
		opts.ProjectScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, ClusterProvisioningError),
	)
}

type ClusterProvisioningSuccessTrackOpts struct {
	*ClusterScopedTrackOpts

	ClusterType models.InfraKind
	InfraID     uint
}

func ClusterProvisioningSuccessTrack(opts *ClusterProvisioningSuccessTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["cluster_type"] = opts.ClusterType
	additionalProps["infra_id"] = opts.InfraID

	return getSegmentClusterTrack(
		opts.ClusterScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, ClusterProvisioningSuccess),
	)
}

type ClusterConnectionStartTrackOpts struct {
	// note that this is a project-scoped track, since the cluster has not been created yet
	*ProjectScopedTrackOpts

	ClusterCandidateID uint
}

func ClusterConnectionStartTrack(opts *ClusterConnectionStartTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["cc_id"] = opts.ClusterCandidateID

	return getSegmentProjectTrack(
		opts.ProjectScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, ClusterConnectionStart),
	)
}

type ClusterConnectionSuccessTrackOpts struct {
	*ClusterScopedTrackOpts

	ClusterCandidateID uint
}

func ClusterConnectionSuccessTrack(opts *ClusterConnectionSuccessTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["cc_id"] = opts.ClusterCandidateID

	return getSegmentClusterTrack(
		opts.ClusterScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, ClusterConnectionSuccess),
	)
}

type RegistryConnectionStartTrackOpts struct {
	// note that this is a project-scoped track, since the cluster has not been created yet
	*ProjectScopedTrackOpts

	// a random id assigned to this connection request
	FlowID string
}

func RegistryConnectionStartTrack(opts *RegistryConnectionStartTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["flow_id"] = opts.FlowID

	return getSegmentProjectTrack(
		opts.ProjectScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, RegistryConnectionStart),
	)
}

type RegistryConnectionSuccessTrackOpts struct {
	*RegistryScopedTrackOpts

	// a random id assigned to this connection request
	FlowID string
}

func RegistryConnectionSuccessTrack(opts *RegistryConnectionSuccessTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["flow_id"] = opts.FlowID

	return getSegmentRegistryTrack(
		opts.RegistryScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, RegistryConnectionSuccess),
	)
}

type GithubConnectionStartTrackOpts struct {
	// note that this is a user-scoped track, since github repos are tied to the user
	*UserScopedTrackOpts
}

func GithubConnectionStartTrack(opts *GithubConnectionStartTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})

	return getSegmentUserTrack(
		opts.UserScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, GithubConnectionStart),
	)
}

type GithubConnectionSuccessTrackOpts struct {
	// note that this is a user-scoped track, since github repos are tied to the user
	*UserScopedTrackOpts
}

func GithubConnectionSuccessTrack(opts *GithubConnectionSuccessTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})

	return getSegmentUserTrack(
		opts.UserScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, GithubConnectionSuccess),
	)
}

type ApplicationLaunchStartTrackOpts struct {
	*ClusterScopedTrackOpts

	FlowID string
}

func ApplicationLaunchStartTrack(opts *ApplicationLaunchStartTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["flow_id"] = opts.FlowID

	return getSegmentClusterTrack(
		opts.ClusterScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, ApplicationLaunchStart),
	)
}

type ApplicationLaunchSuccessTrackOpts struct {
	*ApplicationScopedTrackOpts

	FlowID string
}

func ApplicationLaunchSuccessTrack(opts *ApplicationLaunchSuccessTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["flow_id"] = opts.FlowID

	return getSegmentApplicationTrack(
		opts.ApplicationScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, ApplicationLaunchSuccess),
	)
}

type ApplicationDeploymentWebhookTrackOpts struct {
	*ApplicationScopedTrackOpts

	ImageURI string
}

func ApplicationDeploymentWebhookTrack(opts *ApplicationDeploymentWebhookTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["image_uri"] = opts.ImageURI

	return getSegmentApplicationTrack(
		opts.ApplicationScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, ApplicationDeploymentWebhook),
	)
}

type RegistryProvisioningStartTrackOpts struct {
	// note that this is a project-scoped track, since the registry has not been created yet
	*ProjectScopedTrackOpts

	RegistryType models.InfraKind
	InfraID      uint
}

func RegistryProvisioningStartTrack(opts *RegistryProvisioningStartTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["registry_type"] = opts.RegistryType
	additionalProps["infra_id"] = opts.InfraID

	return getSegmentProjectTrack(
		opts.ProjectScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, RegistryProvisioningStart),
	)
}

type RegistryProvisioningErrorTrackOpts struct {
	// note that this is a project-scoped track, since the registry has not been created yet
	*ProjectScopedTrackOpts

	RegistryType models.InfraKind
	InfraID      uint
}

func RegistryProvisioningErrorTrack(opts *RegistryProvisioningErrorTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["registry_type"] = opts.RegistryType
	additionalProps["infra_id"] = opts.InfraID

	return getSegmentProjectTrack(
		opts.ProjectScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, RegistryProvisioningError),
	)
}

type RegistryProvisioningSuccessTrackOpts struct {
	*RegistryScopedTrackOpts

	RegistryType models.InfraKind
	InfraID      uint
}

func RegistryProvisioningSuccessTrack(opts *RegistryProvisioningSuccessTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["registry_type"] = opts.RegistryType
	additionalProps["infra_id"] = opts.InfraID

	return getSegmentRegistryTrack(
		opts.RegistryScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, RegistryProvisioningSuccess),
	)
}

// HELPERS

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

type UserScopedTrack struct {
	*defaultSegmentTrack

	userID uint
}

type UserScopedTrackOpts struct {
	*defaultTrackOpts

	UserID uint
}

func GetUserScopedTrackOpts(userID uint) *UserScopedTrackOpts {
	return &UserScopedTrackOpts{
		UserID: userID,
	}
}

func (u *UserScopedTrack) getUserId() string {
	return fmt.Sprintf("%d", u.userID)
}

func getSegmentUserTrack(opts *UserScopedTrackOpts, track *defaultSegmentTrack) *UserScopedTrack {
	return &UserScopedTrack{
		defaultSegmentTrack: track,
		userID:              opts.UserID,
	}
}

type ProjectScopedTrack struct {
	*UserScopedTrack

	projectID uint
}

type ProjectScopedTrackOpts struct {
	*UserScopedTrackOpts

	ProjectID uint
}

func GetProjectScopedTrackOpts(userID, projID uint) *ProjectScopedTrackOpts {
	return &ProjectScopedTrackOpts{
		UserScopedTrackOpts: GetUserScopedTrackOpts(userID),
		ProjectID:           projID,
	}
}

func getSegmentProjectTrack(opts *ProjectScopedTrackOpts, track *defaultSegmentTrack) *ProjectScopedTrack {
	track.properties.addProjectProperties(opts)

	return &ProjectScopedTrack{
		UserScopedTrack: getSegmentUserTrack(opts.UserScopedTrackOpts, track),
		projectID:       opts.ProjectID,
	}
}

type RegistryScopedTrack struct {
	*ProjectScopedTrack

	registryID uint
}

type RegistryScopedTrackOpts struct {
	*ProjectScopedTrackOpts

	RegistryID uint
}

func GetRegistryScopedTrackOpts(userID, projID, regID uint) *RegistryScopedTrackOpts {
	return &RegistryScopedTrackOpts{
		ProjectScopedTrackOpts: GetProjectScopedTrackOpts(userID, projID),
		RegistryID:             regID,
	}
}

func getSegmentRegistryTrack(opts *RegistryScopedTrackOpts, track *defaultSegmentTrack) *RegistryScopedTrack {
	track.properties.addRegistryProperties(opts)

	return &RegistryScopedTrack{
		ProjectScopedTrack: getSegmentProjectTrack(opts.ProjectScopedTrackOpts, track),
		registryID:         opts.RegistryID,
	}
}

type ClusterScopedTrack struct {
	*ProjectScopedTrack

	clusterID uint
}

type ClusterScopedTrackOpts struct {
	*ProjectScopedTrackOpts

	ClusterID uint
}

func GetClusterScopedTrackOpts(userID, projID, clusterID uint) *ClusterScopedTrackOpts {
	return &ClusterScopedTrackOpts{
		ProjectScopedTrackOpts: GetProjectScopedTrackOpts(userID, projID),
		ClusterID:              clusterID,
	}
}

func getSegmentClusterTrack(opts *ClusterScopedTrackOpts, track *defaultSegmentTrack) *ClusterScopedTrack {
	track.properties.addClusterProperties(opts)

	return &ClusterScopedTrack{
		ProjectScopedTrack: getSegmentProjectTrack(opts.ProjectScopedTrackOpts, track),
		clusterID:          opts.ClusterID,
	}
}

type ApplicationScopedTrack struct {
	*ClusterScopedTrack

	name      string
	namespace string
}

type ApplicationScopedTrackOpts struct {
	*ClusterScopedTrackOpts

	Name      string
	Namespace string
	ChartName string
}

func GetApplicationScopedTrackOpts(userID, projID, clusterID uint, name, namespace, chartName string) *ApplicationScopedTrackOpts {
	return &ApplicationScopedTrackOpts{
		ClusterScopedTrackOpts: GetClusterScopedTrackOpts(userID, projID, clusterID),
		Name:                   name,
		Namespace:              namespace,
		ChartName:              chartName,
	}
}

func getSegmentApplicationTrack(opts *ApplicationScopedTrackOpts, track *defaultSegmentTrack) *ApplicationScopedTrack {
	track.properties.addApplicationProperties(opts)

	return &ApplicationScopedTrack{
		ClusterScopedTrack: getSegmentClusterTrack(opts.ClusterScopedTrackOpts, track),
		name:               opts.Name,
		namespace:          opts.Namespace,
	}
}
