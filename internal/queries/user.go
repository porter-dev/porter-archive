package queries

import (
	"github.com/porter-dev/porter/internal/models"
	"gorm.io/gorm"
)

// CreateUser is majestic
func CreateUser(db *gorm.DB, user *models.User) (*models.User, error) {
	if err := db.Create(user).Error; err != nil {
		return nil, err
	}
	return user, nil
}
