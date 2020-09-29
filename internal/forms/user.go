package forms

import (
	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/models"
	"golang.org/x/crypto/bcrypt"
	"gopkg.in/yaml.v2"
	"gorm.io/gorm"
)

// WriteUserForm is a generic form for write operations to the User model
type WriteUserForm interface {
	ToUser() (*models.User, error)
}

// CreateUserForm represents the accepted values for creating a user
type CreateUserForm struct {
	WriteUserForm
	Email    string `json:"email" form:"required,max=255,email"`
	Password string `json:"password" form:"required,max=255"`
}

// ToUser converts a CreateUserForm to models.User
//
// TODO -- PASSWORD HASHING HERE
func (cuf *CreateUserForm) ToUser() (*models.User, error) {
	hashed, err := bcrypt.GenerateFromPassword([]byte(cuf.Password), 8)

	if err != nil {
		return nil, err
	}

	return &models.User{
		Email:    cuf.Email,
		Password: string(hashed),
	}, nil
}

// UpdateUserForm represents the accepted values for updating a user
//
// ID is a query parameter, the other two are sent in JSON body
type UpdateUserForm struct {
	WriteUserForm
	ID              uint     `form:"required"`
	RawKubeConfig   string   `json:"rawKubeConfig" form:"required"`
	AllowedClusters []string `json:"allowedClusters" form:"required"`
}

// ToUser converts an UpdateUserForm to models.User by parsing the kubeconfig
// and the allowed clusters to generate a list of ClusterConfigs.
func (uuf *UpdateUserForm) ToUser() (*models.User, error) {
	conf := kubernetes.KubeConfig{}
	rawBytes := []byte(uuf.RawKubeConfig)
	err := yaml.Unmarshal(rawBytes, &conf)

	if err != nil {
		return nil, err
	}

	clusters := conf.ToClusterConfigs(uuf.AllowedClusters)

	return &models.User{
		Model: gorm.Model{
			ID: uuf.ID,
		},
		Clusters:      clusters,
		RawKubeConfig: rawBytes,
	}, nil
}

// DeleteUserForm represents the accepted values for deleting a user
type DeleteUserForm struct {
	WriteUserForm
	ID       uint   `form:"required"`
	Password string `json:"password" form:"required,max=255"`
}

// ToUser converts a DeleteUserForm to models.User using the user ID
func (uuf *DeleteUserForm) ToUser() (*models.User, error) {
	return &models.User{
		Model: gorm.Model{
			ID: uuf.ID,
		},
	}, nil
}
