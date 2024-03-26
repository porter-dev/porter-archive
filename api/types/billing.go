package types

// CreateBillingCustomerRequest is a request for creating a new billing customer.
type CreateBillingCustomerRequest struct {
	UserEmail string `json:"user_email" form:"required"`
}

// PaymentMethod is a subset of the Stripe PaymentMethod type,
// with only the fields used in the dashboard
type PaymentMethod = struct {
	ID           string `json:"id"`
	DisplayBrand string `json:"display_brand"`
	Last4        string `json:"last4"`
	ExpMonth     int64  `json:"exp_month"`
	ExpYear      int64  `json:"exp_year"`
	Default      bool   `json:"is_default"`
}
