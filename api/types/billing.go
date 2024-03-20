package types

// AddProjectBillingRequest is a request for creating a new billing customer.
type CreateBillingCustomerRequest struct {
	UserEmail string `json:"user_email" form:"required"`
}
