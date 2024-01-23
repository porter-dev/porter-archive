package types

// DatastoreType represents the type of the datastore
type DatastoreType string

const (
	// DatastoreType_RDS is the RDS datastore type
	DatastoreType_RDS DatastoreType = "RDS"
	// DatastoreType_ElastiCache is the ElastiCache datastore type
	DatastoreType_ElastiCache DatastoreType = "ELASTICACHE"
)

// CloudProvider represents the cloud provider of the datastore
type CloudProvider string

const (
	// CloudProvider_AWS is the AWS cloud provider
	CloudProvider_AWS CloudProvider = "AWS"
)

// Datastore represents a porter-managed datastore
type Datastore struct {
	Name                              string        `json:"name"`
	Type                              DatastoreType `json:"type"`
	Status                            string        `json:"status"`
	CloudProvider                     CloudProvider `json:"cloud_provider"`
	CloudProviderCredentialIdentifier string        `json:"cloud_provider_credential_identifier"`
}

// GetDatastoreResponse is the response returned from a datastore get request
type GetDatastoreResponse struct {
	Datastore Datastore `json:"datastore"`
}

// DatastoreCredential has all information about connecting to a datastore
type DatastoreCredential struct {
	Host         string
	Port         int
	Username     string
	Password     string
	DatabaseName string
}

// RDSCredential has all information about connecting to an RDS instance
type RDSCredential struct {
	Host     string `json:"DB_HOST"`
	Port     string `json:"DB_PORT"`
	Password string `json:"DB_PASS"`
	Username string `json:"DB_USER"`
}

// ElasticacheCredential has all information about connecting to an ElastiCache instance
type ElasticacheCredential struct {
	Host     string `json:"REDIS_HOST"`
	Port     string `json:"REDIS_PORT"`
	Password string `json:"REDIS_PASS"`
}
