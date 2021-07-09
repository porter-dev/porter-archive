package repository

import (
	"github.com/porter-dev/porter/internal/models"
)

// WriteUser is the function type for all User write operations
type WriteUser func(user *models.User) (*models.User, error)

// UserRepository represents the set of queries on the User model
type UserRepository interface {
	CreateUser(user *models.User) (*models.User, error)
	CheckPassword(id int, pwd string) (bool, error)
	ReadUser(id uint) (*models.User, error)
	ReadUserByEmail(email string) (*models.User, error)
	ReadUserByGithubUserID(id int64) (*models.User, error)
	ReadUserByGoogleUserID(id string) (*models.User, error)
	ListUsersByIDs(ids []uint) ([]*models.User, error)
	UpdateUser(user *models.User) (*models.User, error)
	DeleteUser(user *models.User) (*models.User, error)
}
