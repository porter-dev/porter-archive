package repository

import (
	"github.com/porter-dev/porter/internal/models"
	"gorm.io/gorm"
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

// DefaultUserRepository uses gorm.DB for querying the database
type DefaultUserRepository struct {
	db *gorm.DB
}

// NewDefaultUserRepository returns a DefaultUserRepository which uses
// gorm.DB for querying the database
func NewDefaultUserRepository(db *gorm.DB) *DefaultUserRepository {
	return &DefaultUserRepository{db}
}

// CreateUser adds a new User row to the Users table in the database
func (repo DefaultUserRepository) CreateUser(user *models.User) (*models.User, error) {
	if err := repo.db.Create(user).Error; err != nil {
		return nil, err
	}
	return user, nil
}

// ReadUser finds a single user based on their unique id
func (repo DefaultUserRepository) ReadUser(id uint) (*models.User, error) {
	user := &models.User{}
	if err := repo.db.Where("id = ?", id).First(&user).Error; err != nil {
		return nil, err
	}
	return user, nil
}

// UpdateUser modifies an existing User in the database
func (repo DefaultUserRepository) UpdateUser(user *models.User) (*models.User, error) {
	if err := repo.db.First(&models.User{}, user.ID).Updates(user).Error; err != nil {
		return nil, err
	}

	return user, nil
}

// DeleteUser deletes a single user using their unique id
func (repo DefaultUserRepository) DeleteUser(user *models.User) (*models.User, error) {
	if err := repo.db.First(&models.User{}, user.ID).Delete(&user).Error; err != nil {
		return nil, err
	}
	return user, nil
}
