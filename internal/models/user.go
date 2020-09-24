package models

import (
	"github.com/jinzhu/gorm"
)

// User type that extends gorm.Model
type User struct {
	gorm.Model
	// Unique email for each user
	Email,
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

// CreateUserForm represents the accepted values for creating a user
type CreateUserForm struct {
	Email    string `json:"email" form:"required,max=255,email"`
	Password string `json:"password" form:"required,max=255"`
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
		Email:         u.Email,
		Clusters:      clustersExt,
		RawKubeConfig: string(u.RawKubeConfig),
	}
}

// ToUser converts a user form to a user
//
// TODO -- PASSWORD HASHING HERE
func (cuf *CreateUserForm) ToUser() (*User, error) {
	return &User{
		Email:    cuf.Email,
		Password: cuf.Password,
	}, nil
}
