package models

import (
	"gorm.io/gorm"
)

// User type that extends gorm.Model
type User struct {
	gorm.Model
	// Unique email for each user
	// Email string `gorm:"unique"`
	Email string
	// Hashed password
	Password string
	// The clusters that this user has linked
	Clusters []ClusterConfig
	// The raw kubeconfig uploaded by this user
	RawKubeConfig []byte
}

// UserExternal represents the User type that is sent over REST
type UserExternal struct {
	ID            uint                     `json:"id"`
	Email         string                   `json:"email"`
	Clusters      []*ClusterConfigExternal `json:"clusters"`
	RawKubeConfig string                   `json:"rawKubeConfig"`
}

// Externalize generates an external User to be shared over REST
func (u *User) Externalize() *UserExternal {
	clustersExt := make([]*ClusterConfigExternal, 0)

	for _, cluster := range u.Clusters {
		clustersExt = append(clustersExt, cluster.Externalize())
	}

	return &UserExternal{
		ID:            u.ID,
		Email:         u.Email,
		Clusters:      clustersExt,
		RawKubeConfig: string(u.RawKubeConfig),
	}
}
