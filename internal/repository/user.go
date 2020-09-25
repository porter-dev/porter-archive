package repository

import (
	"github.com/porter-dev/porter/internal/models"
)

// WriteUser is the function type for all User write operations
type WriteUser func(user *models.User) (*models.User, error)

// UserRepository represents the set of queries on the User model
type UserRepository interface {
	CreateUser(user *models.User) (*models.User, error)
	ReadUser(id uint) (*models.User, error)
	UpdateUser(user *models.User) (*models.User, error)
	DeleteUser(user *models.User) (*models.User, error)
}
