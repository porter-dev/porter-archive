package types

import "github.com/stripe/stripe-go/v76"

// AddProjectBillingRequest is a request for creating a new billing customer.
type CreateBillingCustomerRequest struct {
	UserEmail string `json:"user_email" form:"required"`
}

// PaymentMethod is a wrapper for the Stripe type, but it may be changed to include only
// the necessary fields.
type PaymentMethod = *stripe.PaymentMethod
