package repository

import (
	"github.com/porter-dev/porter/internal/models"
)

// ReferralRepository represents the set of queries on the Referral model
type ReferralRepository interface {
	CreateReferral(referral *models.Referral) (*models.Referral, error)
	GetReferralByReferredID(referredID uint) (*models.Referral, error)
	CountReferralsByProjectID(projectID uint, status string) (int64, error)
	UpdateReferral(referral *models.Referral) (*models.Referral, error)
}
