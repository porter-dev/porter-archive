package types

// DatastoreType represents the type of the datastore
type DatastoreType string

const (
	// DatastoreType_RDS is the RDS datastore type
	DatastoreType_RDS DatastoreType = "RDS"
	// DatastoreType_ElastiCache is the ElastiCache datastore type
	DatastoreType_ElastiCache DatastoreType = "ELASTICACHE"
)

// CreateDatastoreProxyRequest is the request body for the create datastore proxy endpoint
type CreateDatastoreProxyRequest struct{}

// CreateDatastoreProxyResponse is the response body for the create datastore proxy endpoint
type CreateDatastoreProxyResponse struct {
	// PodName is the name of the pod that was created
	PodName string `json:"pod_name"`
	// Credential is the credential used to connect to the datastore
	Credential DatastoreCredential `json:"credential"`
	// ClusterID is the ID of the cluster that the pod was created in
	ClusterID uint `json:"cluster_id"`
	// Namespace is the namespace that the pod was created in
	Namespace string `json:"namespace"`
	// Type is the type of datastore
	Type string `json:"type"`
}

// DatastoreCredential has all information about connecting to a datastore
type DatastoreCredential struct {
	Host         string `json:"host"`
	Port         int    `json:"port"`
	Username     string `json:"username"`
	Password     string `json:"password"`
	DatabaseName string `json:"database_name"`
}
