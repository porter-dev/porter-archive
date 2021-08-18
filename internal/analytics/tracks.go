package analytics

import (
	"fmt"

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
	*ProjectScopedTrackOpts

	ClusterType string // EKS, DOKS, or GKE
}

func ClusterProvisioningStartTrack(opts *ClusterProvisioningStartTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["cluster_type"] = opts.ClusterType

	return getSegmentProjectTrack(
		opts.ProjectScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, ClusterProvisioningStart),
	)
}

type ClusterProvisioningErrorTrackOpts struct {
	*ClusterScopedTrackOpts

	ClusterType string // EKS, DOKS, or GKE
	Errors      []string
}

func ClusterProvisioningErrorTrack(opts *ClusterProvisioningErrorTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["cluster_type"] = opts.ClusterType
	additionalProps["errors"] = opts.Errors

	return getSegmentClusterTrack(
		opts.ClusterScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, ClusterProvisioningError),
	)
}

type ClusterProvisioningSuccessTrackOpts struct {
	*ClusterScopedTrackOpts

	ClusterType   string // EKS, DOKS, or GKE
	ClusterServer string
}

func ClusterProvisioningSuccessTrack(opts *ClusterProvisioningSuccessTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["cluster_type"] = opts.ClusterType
	additionalProps["cluster_server"] = opts.ClusterServer

	return getSegmentClusterTrack(
		opts.ClusterScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, ClusterProvisioningSuccess),
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

func (p segmentProperties) addApplicationProperties(opts *ApplicationScopedTrackOpts) {
	p["app_name"] = opts.Name
	p["app_namespace"] = opts.Namespace
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
}

func GetApplicationScopedTrackOpts(userID, projID, clusterID uint, name, namespace string) *ApplicationScopedTrackOpts {
	return &ApplicationScopedTrackOpts{
		ClusterScopedTrackOpts: GetClusterScopedTrackOpts(userID, projID, clusterID),
		Name:                   name,
		Namespace:              namespace,
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

// type segmentProjectScopedTrack struct {
// 	*UserScopedTrack

// 	ProjID uint
// 	ProjName string
// }

// type segmentClusterScopedTrack struct {
// 	*segmentProjectScopedTrack

// 	clusterID uint
// 	clusterName string
// }

// type segmentApplicationScopedTrack struct {
// 	*segmentClusterScopedTrack

// 	appName string
// 	appNamespace string
// }

// // CreateSegmentNewUserTrack creates a track of type "New User", which
// // tracks when a user has registered
// func CreateSegmentNewUserTrack(user *models.User) *segmentNewUserTrack {
// 	userId := fmt.Sprintf("%v", user.ID)

// 	return &segmentNewUserTrack{
// 		userId:    userId,
// 		userEmail: user.Email,
// 	}
// }

// func (t *segmentNewUserTrack) getUserId() string {
// 	return t.userId
// }

// func (t *segmentNewUserTrack) getEvent() SegmentEvent {
// 	return NewUser
// }

// func (t *segmentNewUserTrack) getProperties() segment.Properties {
// 	return segment.NewProperties().Set("email", t.userEmail)
// }

// type segmentRedeployViaWebhookTrack struct {
// 	userId     string
// 	repository string
// }

// // CreateSegmentRedeployViaWebhookTrack creates a track of type "Triggered Re-deploy via Webhook", which
// // tracks whenever a repository is redeployed via webhook call
// func CreateSegmentRedeployViaWebhookTrack(userId string, repository string) *segmentRedeployViaWebhookTrack {
// 	return &segmentRedeployViaWebhookTrack{
// 		userId:     userId,
// 		repository: repository,
// 	}
// }

// func (t *segmentRedeployViaWebhookTrack) getUserId() string {
// 	return t.userId
// }

// func (t *segmentRedeployViaWebhookTrack) getEvent() SegmentEvent {
// 	return RedeployViaWebhook
// }

// func (t *segmentRedeployViaWebhookTrack) getProperties() segment.Properties {
// 	return segment.NewProperties().Set("repository", t.repository)
// }

// type segmentNewProjectEventTrack struct {
// 	userId   string
// 	projId   string
// 	projName string
// }

// // NewProjectEventOpts are the parameters for creating a "New Project Event" track
// type NewProjectEventOpts struct {
// 	UserID   string
// 	ProjID   string
// 	ProjName string
// }

// // CreateSegmentNewProjectEvent creates a track of type "New Project Event", which
// // tracks whenever a cluster is newly provisioned, connected, or destroyed.
// func CreateSegmentNewProjectEvent(opts *NewProjectEventOpts) *segmentNewProjectEventTrack {
// 	return &segmentNewProjectEventTrack{
// 		userId:   opts.UserID,
// 		projId:   opts.ProjID,
// 		projName: opts.ProjName,
// 	}
// }

// func (t *segmentNewProjectEventTrack) getUserId() string {
// 	return t.userId
// }

// func (t *segmentNewProjectEventTrack) getEvent() SegmentEvent {
// 	return NewProjectEvent
// }

// func (t *segmentNewProjectEventTrack) getProperties() segment.Properties {
// 	return segment.NewProperties().
// 		Set("Project ID", t.projId).
// 		Set("Project Name", t.projName)
// }

// type segmentNewClusterEventTrack struct {
// 	userId      string
// 	projId      string
// 	clusterName string
// 	clusterType string // EKS, DOKS, or GKE
// 	eventType   string // connected, provisioned, or destroyed
// }

// // NewClusterEventOpts are the parameters for creating a "New Cluster Event" track
// type NewClusterEventOpts struct {
// 	UserId      string
// 	ProjId      string
// 	ClusterName string
// 	ClusterType string // EKS, DOKS, or GKE
// 	EventType   string // connected, provisioned, or destroyed
// }

// // CreateSegmentNewClusterEvent creates a track of type "New Cluster Event", which
// // tracks whenever a cluster is newly provisioned, connected, or destroyed.
// func CreateSegmentNewClusterEvent(opts *NewClusterEventOpts) *segmentNewClusterEventTrack {
// 	return &segmentNewClusterEventTrack{
// 		userId:      opts.UserId,
// 		projId:      opts.ProjId,
// 		clusterName: opts.ClusterName,
// 		clusterType: opts.ClusterType,
// 		eventType:   opts.EventType,
// 	}
// }

// func (t *segmentNewClusterEventTrack) getUserId() string {
// 	return t.userId
// }

// func (t *segmentNewClusterEventTrack) getEvent() SegmentEvent {
// 	return NewClusterEvent
// }

// func (t *segmentNewClusterEventTrack) getProperties() segment.Properties {
// 	return segment.NewProperties().Set("Project ID", t.projId).Set("Cluster Name", t.clusterName).Set("Cluster Type", t.clusterType).Set("Event Type", t.eventType)
// }
