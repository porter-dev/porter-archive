package gorm

import (
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

// ReferralRepository uses gorm.DB for querying the database
type ReferralRepository struct {
	db *gorm.DB
}

// NewReferralRepository returns a ReferralRepository which uses
// gorm.DB for querying the database
func NewReferralRepository(db *gorm.DB) repository.ReferralRepository {
	return &ReferralRepository{db}
}

// CreateReferral creates a new referral in the database
func (repo *ReferralRepository) CreateReferral(referral *models.Referral) (*models.Referral, error) {
	user := &models.User{}

	if err := repo.db.Where("referral_code = ?", referral.Code).First(&user).Error; err != nil {
		return nil, err
	}

	assoc := repo.db.Model(&user).Association("Referrals")

	if assoc.Error != nil {
		return nil, assoc.Error
	}

	if err := assoc.Append(referral); err != nil {
		return nil, err
	}

	return referral, nil
}

// GetReferralByCode returns the number of referrals a user has made
func (repo *ReferralRepository) GetReferralCountByUserID(userID uint) (int, error) {
	referrals := []models.Referral{}
	if err := repo.db.Where("user_id = ?", userID).Find(&referrals).Error; err != nil {
		return 0, err
	}
	return len(referrals), nil
}
