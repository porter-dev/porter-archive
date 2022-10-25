package notifier

import "time"

type Notifier interface {
	Notify(opts *NotifyOpts) error
}

type DeploymentStatus string

const (
	StatusHelmDeployed DeploymentStatus = "helm_deployed"
	StatusPodCrashed   DeploymentStatus = "pod_crashed"
	StatusHelmFailed   DeploymentStatus = "helm_failed"
)

type NotifyOpts struct {
	// ProjectID is the id of the Porter project that this deployment belongs to
	ProjectID uint

	// ClusterID is the id of the Porter cluster that this deployment belongs to
	ClusterID uint

	// ClusterName is the name of the cluster that this deployment was deployed in
	ClusterName string

	// Status is the current status of the deployment.
	Status DeploymentStatus

	// Info is any additional information about this status, such as an error message if
	// the deployment failed.
	Info string

	// Name is the name of the deployment that this notification refers to.
	Name string

	// Namespace is the Kubernetes namespace of the deployment that this notification refers to.
	Namespace string

	URL string

	Timestamp *time.Time

	Version int
}
