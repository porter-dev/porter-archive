package models

import (
	"github.com/lithammer/shortuuid/v4"
	"github.com/porter-dev/porter/api/types"
	"gorm.io/gorm"
)

// Referral type that extends gorm.Model
type Referral struct {
	gorm.Model

	// Code is the referral code that is shared with the referred user
	Code string
	// UserID is the ID of the user who made the referral
	UserID uint
	// ReferredUserID is the ID of the user who was referred
	ReferredUserID uint
	// Status is the status of the referral (pending, signed_up, etc.)
	Status string
}

func NewReferralCode() string {
	return shortuuid.New()
}

// ToReferralType generates an external types.Referral to be shared over REST
func (r *Referral) ToReferralType() *types.Referral {
	return &types.Referral{
		ID:             r.ID,
		ReferredUserID: r.ReferredUserID,
		Status:         r.Status,
	}
}
