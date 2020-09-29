package models

import (
	"gorm.io/gorm"
)

// User type that extends gorm.Model
type User struct {
	gorm.Model

	Email         string          `json:"email" gorm:"unique"`
	Password      string          `json:"password"`
	Clusters      []ClusterConfig `json:"clusters"`
	RawKubeConfig []byte          `json:"rawKubeConfig"`
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
