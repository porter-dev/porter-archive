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

// ReadUser finds a single user based on their unique id
func ReadUser(db *gorm.DB, id uint) (*models.User, error) {
	user := &models.User{}
	if err := db.Where("id = ?", id).First(&user).Error; err != nil {
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

// DeleteUser deletes a single user using their unique id
func DeleteUser(db *gorm.DB, user *models.User) (*models.User, error) {
	if err := db.First(&models.User{}, user.ID).Delete(&user).Error; err != nil {
		return nil, err
	}
	return user, nil
}
