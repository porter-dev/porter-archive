package gorm

import (
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

// AllowlistRepository uses gorm.DB for querying the database
type AllowlistRepository struct {
	db *gorm.DB
}

// NewAllowlistRepository returns a AllowListRepository which uses
// gorm.DB for querying the database.
func NewAllowlistRepository(db *gorm.DB) repository.AllowlistRepository {
	return &AllowlistRepository{db}
}

func (repo *AllowlistRepository) UserEmailExists(email string) (bool, error) {
	al := &models.Allowlist{}
	result := repo.db.Where("user_email = ?", email).Find(&al)

	if err := result.Error; err != nil {
		return false, err
	}

	if result.RowsAffected > 0 {
		return true, nil
	}

	return false, nil
}
