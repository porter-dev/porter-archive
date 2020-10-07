package models

// Context represents the configuration for a single cluster-user pair
type Context struct {
	// Name is the name of the context
	Name string `json:"name"`
	// Server is the endpoint of the kube apiserver for a cluster
	Server string `json:"server"`
	// Cluster is the name of the cluster
	Cluster string `json:"cluster"`
	// User is the name of the user for a cluster
	User string `json:"user"`
	// Selected determines if the context has been selected for use in the
	// dashboard
	Selected bool `json:"selected"`
}
