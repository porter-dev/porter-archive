package repository

import (
	"github.com/porter-dev/porter/internal/models"
)

// ReferralRepository represents the set of queries on the Referral model
type ReferralRepository interface {
	CreateReferral(referral *models.Referral) (*models.Referral, error)
	// ReadReferral(referralID uint) (*models.Referral, error)
	// ReadReferralByUserID(userID, referralID string) (*models.Referral, error)
	// ListReferralsByUserID(userID uint) ([]*models.Referral, error)
	// UpdateReferral(referral *models.Referral) (*models.Referral, error)
	// DeleteReferral(referralID uint) error
}
