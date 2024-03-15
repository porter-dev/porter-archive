package datastore

import (
	"time"

	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/porter/api/server/handlers/environment_groups"
)

// Datastore describes an outbound datastores response entry
type Datastore struct {
	// Name is the name of the datastore
	Name string `json:"name"`
	// Type is the type of the datastore
	Type string `json:"type"`
	// Engine is the engine of the datastore
	Engine string `json:"engine,omitempty"`
	// Env is the env group for the datastore
	Env environment_groups.EnvironmentGroupListItem `json:"env,omitempty"`
	// Metadata is a list of metadata objects for the datastore - TODO: remove this field, it is unnecessary
	Metadata []*porterv1.DatastoreMetadata `json:"metadata,omitempty"`
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
	// B64Proto is the base64 encoded datastore proto. Note that this is only populated for datastores created with the new cloud contract flow
	B64Proto string `json:"b64_proto"`
}

// Credential has all information about connecting to a datastore
type Credential struct {
	Host         string `json:"host"`
	Port         int    `json:"port"`
	Username     string `json:"username"`
	Password     string `json:"password"`
	DatabaseName string `json:"database_name"`
}
