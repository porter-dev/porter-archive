package analytics

import (
	"fmt"
)

// UserScopedTrack is a track that automatically adds a user id to the tracking
type UserScopedTrack struct {
	*defaultSegmentTrack

	userID uint
}

// UserScopedTrackOpts are the options for created a new user-scoped track
type UserScopedTrackOpts struct {
	*defaultTrackOpts

	UserID uint
}

// GetUserScopedTrackOpts is a helper method to getting the UserScopedTrackOpts
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

// ProjectScopedTrack is a track that automatically adds a project id to the track
type ProjectScopedTrack struct {
	*UserScopedTrack

	projectID uint
}

// ProjectScopedTrackOpts are the options for created a new project-scoped track
type ProjectScopedTrackOpts struct {
	*UserScopedTrackOpts

	ProjectID uint
}

// GetProjectScopedTrackOpts is a helper method to getting the ProjectScopedTrackOpts
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

// RegistryScopedTrack is a track that automatically adds a registry id to the track
type RegistryScopedTrack struct {
	*ProjectScopedTrack

	registryID uint
}

// RegistryScopedTrackOpts are the options for created a new registry-scoped track
type RegistryScopedTrackOpts struct {
	*ProjectScopedTrackOpts

	RegistryID uint
}

// GetRegistryScopedTrackOpts is a helper method to getting the RegistryScopedTrackOpts
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

// ClusterScopedTrack is a track that automatically adds a cluster id to the track
type ClusterScopedTrack struct {
	*ProjectScopedTrack

	clusterID uint
}

// ClusterScopedTrackOpts are the options for created a new cluster-scoped track
type ClusterScopedTrackOpts struct {
	*ProjectScopedTrackOpts

	ClusterID uint
}

// GetClusterScopedTrackOpts is a helper method to getting the ClusterScopedTrackOpts
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

// ApplicationScopedTrack is a track that automatically adds an app name and namespace to the track
type ApplicationScopedTrack struct {
	*ClusterScopedTrack

	name      string
	namespace string
}

// ApplicationScopedTrackOpts are the options for created a new app-scoped track
type ApplicationScopedTrackOpts struct {
	*ClusterScopedTrackOpts

	Name      string
	Namespace string
	ChartName string
}

// GetApplicationScopedTrackOpts is a helper method to getting the ApplicationScopedTrackOpts
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
