package types

type DatastoreType string

const (
	DatastoreType_RDS         DatastoreType = "RDS"
	DatastoreType_ElastiCache DatastoreType = "ELASTICACHE"
)

type CloudProvider string

const (
	CloudProvider_AWS CloudProvider = "AWS"
)

type Datastore struct {
	Name                              string        `json:"name"`
	Type                              DatastoreType `json:"type"`
	Status                            string        `json:"status"`
	CloudProvider                     CloudProvider `json:"cloud_provider"`
	CloudProviderCredentialIdentifier string        `json:"cloud_provider_credential_identifier"`
}

type GetDatastoreResponse struct {
	Datastore Datastore `json:"datastore"`
}

type DatastoreCredential struct {
	Host         string
	Port         int
	Username     string
	Password     string
	DatabaseName string
}

type RDSCredential struct {
	Host     string `json:"DB_HOST"`
	Port     string `json:"DB_PORT"`
	Password string `json:"DB_PASS"`
	Username string `json:"DB_USER"`
}

type ElasticacheCredential struct {
	Host     string `json:"REDIS_HOST"`
	Port     string `json:"REDIS_PORT"`
	Password string `json:"REDIS_PASS"`
}
