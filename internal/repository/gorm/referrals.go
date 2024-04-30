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
	project := &models.Project{}

	if err := repo.db.Where("referral_code = ?", referral.Code).First(&project).Error; err != nil {
		return nil, err
	}

	assoc := repo.db.Model(&project).Association("Referrals")

	if assoc.Error != nil {
		return nil, assoc.Error
	}

	if err := assoc.Append(referral); err != nil {
		return nil, err
	}

	return referral, nil
}

// CountReferralsByProjectID returns the number of referrals a user has made
func (repo *ReferralRepository) CountReferralsByProjectID(projectID uint, status string) (int64, error) {
	var count int64

	if err := repo.db.Model(&models.Referral{}).Where("project_id = ? AND status = ?", projectID, status).Count(&count).Error; err != nil {
		return 0, err
	}

	return count, nil
}

// GetReferralByReferredID returns a referral by the referred user's ID
func (repo *ReferralRepository) GetReferralByReferredID(referredID uint) (*models.Referral, error) {
	referral := &models.Referral{}
	if err := repo.db.Where("referred_user_id = ?", referredID).First(&referral).Error; err != nil {
		return &models.Referral{}, err
	}
	return referral, nil
}

func (repo *ReferralRepository) UpdateReferral(referral *models.Referral) (*models.Referral, error) {
	if err := repo.db.Save(referral).Error; err != nil {
		return nil, err
	}

	return referral, nil
}
