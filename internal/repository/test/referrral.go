package test

import (
	"errors"

	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
)

// ReferralRepository represents the set of queries on the Referral model
type ReferralRepository struct{}

// NewAppInstanceRepository returns the test AppInstanceRepository
func NewReferralRepository() repository.ReferralRepository {
	return &ReferralRepository{}
}

func (repo *ReferralRepository) CreateReferral(referral *models.Referral) (*models.Referral, error) {
	return referral, errors.New("cannot read database")
}

func (repo *ReferralRepository) CountReferralsByProjectID(projectID uint, status string) (int64, error) {
	return 0, errors.New("cannot read database")
}

func (repo *ReferralRepository) GetReferralByReferredID(referredID uint) (*models.Referral, error) {
	return &models.Referral{}, errors.New("cannot read database")
}

func (repo *ReferralRepository) UpdateReferral(referral *models.Referral) (*models.Referral, error) {
	return referral, errors.New("cannot read database")
}
