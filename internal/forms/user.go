package forms

import (
	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/models"
	"golang.org/x/crypto/bcrypt"
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

// LoginUserForm represents the accepted values for logging a user in
type LoginUserForm struct {
	WriteUserForm
	ID       uint   `form:"required"`
	Email    string `json:"email" form:"required,max=255,email"`
	Password string `json:"password" form:"required,max=255"`
}

// ToUser converts a LoginUserForm to models.User
func (luf *LoginUserForm) ToUser() (*models.User, error) {
	hashed, err := bcrypt.GenerateFromPassword([]byte(luf.Password), 8)

	if err != nil {
		return nil, err
	}

	return &models.User{
		Model: gorm.Model{
			ID: luf.ID,
		},
		Email:    luf.Email,
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
	rawBytes := []byte(uuf.RawKubeConfig)
	clusters, err := kubernetes.GetAllowedClusterConfigsFromBytes(rawBytes, uuf.AllowedClusters)

	if err != nil {
		return nil, err
	}

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
