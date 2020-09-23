package models

import (
	"github.com/jinzhu/gorm"
)

// User type that extends gorm.Model
type User struct {
	gorm.Model
	// Unique username for each user
	Username,
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
	Username      string                   `json:"username"`
	Clusters      []*ClusterConfigExternal `json:"clusters"`
	RawKubeConfig string                   `json:"rawKubeConfig"`
}

// CreateUserForm represents the accepted values for creating a user
type CreateUserForm struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// UpdateUserForm represents the accepted values for updating a user
type UpdateUserForm struct {
	RawKubeConfig string `json:"rawKubeConfig"`
}

// Externalize generates an external User to be shared over REST
func (u *User) Externalize() *UserExternal {
	clustersExt := make([]*ClusterConfigExternal, 0)

	for _, cluster := range u.Clusters {
		clustersExt = append(clustersExt, cluster.Externalize())
	}

	return &UserExternal{
		ID:            u.ID,
		Username:      u.Username,
		Clusters:      clustersExt,
		RawKubeConfig: string(u.RawKubeConfig),
	}
}

// ToUser converts a user form to a user
//
// TODO -- PASSWORD HASHING HERE
func (cuf *CreateUserForm) ToUser() (*User, error) {
	return &User{
		Username: cuf.Username,
		Password: cuf.Password,
	}, nil
}
