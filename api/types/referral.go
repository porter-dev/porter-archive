package types

type Referral struct {
	ID uint `json:"id"`
	// Code is the referral code that is shared with the referred user
	Code string `json:"referral_code"`
	// ReferredUserID is the ID of the user who was referred
	ReferredUserID uint `json:"referred_user_id"`
	// Status is the status of the referral (pending, signed_up, etc.)
	Status string `json:"status"`
}
