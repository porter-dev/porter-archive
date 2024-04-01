package datastore

import (
	"time"
)

// Datastore describes an outbound datastores response entry
type Datastore struct {
	// Name is the name of the datastore
	Name string `json:"name"`
	// Type is the type of the datastore
	Type string `json:"type"`
	// Engine is the engine of the datastore
	Engine string `json:"engine,omitempty"`
	// Status is the status of the datastore
	Status string `json:"status"`
	// CreatedAtUTC is the time the datastore was created in UTC
	CreatedAtUTC time.Time `json:"created_at"`
	// CloudProvider is the cloud provider associated with the datastore
	CloudProvider string `json:"cloud_provider"`
	// CloudProviderCredentialIdentifier is the cloud provider credential identifier associated with the datastore
	CloudProviderCredentialIdentifier string `json:"cloud_provider_credential_identifier"`
	// Credential is the credential used for connecting to the datastore
	Credential Credential `json:"credential"`
	// ConnectedClusterIds is a list of connected cluster ids
	ConnectedClusterIds []uint `json:"connected_cluster_ids,omitempty"`
	// OnManagementCluster is a flag indicating whether the datastore is on the management cluster
	OnManagementCluster bool `json:"on_management_cluster"`
}

// Credential has all information about connecting to a datastore
type Credential struct {
	Host         string `json:"host"`
	Port         int    `json:"port"`
	Username     string `json:"username"`
	Password     string `json:"password"`
	DatabaseName string `json:"database_name"`
}
