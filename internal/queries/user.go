package queries

import (
	"github.com/porter-dev/porter/internal/models"
	"gorm.io/gorm"
)

// CreateUser adds a new User row to the Users table in the database
func CreateUser(db *gorm.DB, user *models.User) (*models.User, error) {
	if err := db.Create(user).Error; err != nil {
		return nil, err
	}
	return user, nil
}

// UpdateUser modifies an existing User in the database
func UpdateUser(db *gorm.DB, user *models.User) (*models.User, error) {
	if err := db.First(&models.User{}, user.ID).Updates(user).Error; err != nil {
		return nil, err
	}

	return user, nil
}
