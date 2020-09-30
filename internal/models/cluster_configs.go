package models

import "gorm.io/gorm"

// ClusterConfig that extends gorm.Model
//
// ClusterConfig represents the configuration for a single cluster-user pair. This gets
// associated with a specific user, and is primarily used for simplicity.
type ClusterConfig struct {
	gorm.Model
	// Name is the name of the cluster
	Name,
	// Server is the endpoint of the kube apiserver for a cluster
	Server,
	// Context is the name of the context
	Context,
	// User is the name of the user for a cluster
	User string
	// UserID is the foreign key of User, gorm creates by default
	UserID uint
}

// ClusterConfigExternal is the ClusterConfig type sent over REST
type ClusterConfigExternal struct {
	Name    string `json:"name"`
	Server  string `json:"server"`
	Context string `json:"context"`
	User    string `json:"user"`
}

// Externalize generates an external ClusterConfig to be shared over REST
func (cc *ClusterConfig) Externalize() *ClusterConfigExternal {
	return &ClusterConfigExternal{
		Name:    cc.Name,
		Server:  cc.Server,
		Context: cc.Context,
		User:    cc.User,
	}
}
