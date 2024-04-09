package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// DatastoreStatus is the status of an app revision
type DatastoreStatus string

const (
	// DatastoreStatus_Creating is the status for a datastore that is being created
	DatastoreStatus_Creating DatastoreStatus = "CREATING"
	// DatastoreStatus_Available is the status for a datastore that is available
	DatastoreStatus_Available DatastoreStatus = "AVAILABLE"
	// DatastoreStatus_AwaitingDeletion is the status for a datastore that is awaiting deletion
	DatastoreStatus_AwaitingDeletion DatastoreStatus = "AWAITING_DELETION"
)

// Datastore is a database model that represents a Porter-provisioned datastore
type Datastore struct {
	gorm.Model

	// ID is a uuid that references the datastore
	ID uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`

	// ProjectID is the ID of the project that the datastore belongs to
	ProjectID uint `json:"project_id"`

	// Name is the name of the datastore
	Name string `json:"name"`

	// CloudProvider is the cloud provider that hosts the Kubernetes Cluster. Accepted values: [AWS, GCP, AZURE]
	CloudProvider string `json:"cloud_provider"`

	// CloudProviderCredentialIdentifier is a reference to find the credentials required for access the cluster's API.
	// This was likely the credential that was used to create the cluster.
	// For AWS EKS clusters, this will be an ARN for the final target role in the assume role chain.
	CloudProviderCredentialIdentifier string `json:"cloud_provider_credential_identifier"`

	// Type is the type of datastore. Accepted values: [RDS, ELASTICACHE, MANAGED_POSTGRES, MANAGED_REDIS]
	Type string `json:"type"`

	// Engine is the engine of the datastore. Accepted values: [POSTGRES, AURORA-POSTGRES, REDIS]
	Engine string `json:"engine"`

	// Status describes the status of a datastore
	Status DatastoreStatus `json:"status"`

	// OnManagementCluster is a flag that indicates whether the datastore is hosted on the management cluster or on the customer's cluster
	OnManagementCluster bool `json:"on_management_cluster" gorm:"not null;default:false"`
}

// IsLegacy returns true if the datastore is a legacy datastore
func (d *Datastore) IsLegacy() bool {
	return !d.OnManagementCluster && !(d.Type == "MANAGED_POSTGRES" || d.Type == "MANAGED_REDIS")
}
