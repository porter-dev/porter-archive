package types

import "github.com/google/uuid"

// Stripe types

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

// Metronome Types

// Customer represents a customer in Metronome
type Customer struct {
	ID            uuid.UUID         `json:"id"`
	Name          string            `json:"name"`           // Required. Name of the customer
	Aliases       []string          `json:"ingest_aliases"` // Aliases that can be used to refer to this customer in usage events
	BillingConfig BillingConfig     `json:"billing_config,omitempty"`
	CustomFields  map[string]string `json:"custom_fields,omitempty"`
}

// CustomerArchiveRequest will archive the customer in Metronome.
type CustomerArchiveRequest struct {
	CustomerID uuid.UUID `json:"id"`
}

// BillingConfig is the configuration for the billing provider (Stripe, etc.)
type BillingConfig struct {
	BillingProviderType       string `json:"billing_provider_type"` // Required. Can be any of "aws_marketplace", "stripe", "netsuite", "custom", "azure_marketplace", "quickbooks_online", or "workday"
	BillingProviderCustomerID string `json:"billing_provider_customer_id"`
	StripeCollectionMethod    string `json:"stripe_collection_method"` // Can be any of "charge_automatically" or "send_invoice"
}

// AddCustomerPlanRequest represents a request to add a customer plan with specific details.
type AddCustomerPlanRequest struct {
	PlanID              uuid.UUID `json:"plan_id"`                          // Required. The customer ID, plan ID, and date range for the plan to be applied.
	StartingOn          string    `json:"starting_on"`                      // Required. RFC 3339 timestamp for when the plan becomes active for this customer. Must be at 0:00 UTC (midnight).
	EndingBefore        string    `json:"ending_before,omitempty"`          // Optional. RFC 3339 timestamp for when the plan ends (exclusive) for this customer. Must be at 0:00 UTC (midnight).
	NetPaymentTermsDays int       `json:"net_payment_terms_days,omitempty"` // Number of days after issuance of invoice after which the invoice is due (e.g., Net 30).
}

// AddCustomerPlanResponse is a response to the add customer plan request. Returns customer-plan relationship id.
type AddCustomerPlanResponse struct {
	Data struct {
		CustomerPlanID uuid.UUID `json:"id"`
	} `json:"data"`
}

// EndCustomerPlanRequest represents a request to end the plan for a specific customer.
type EndCustomerPlanRequest struct {
	EndingBefore       string `json:"ending_before,omitempty"` // RFC 3339 timestamp for when the plan ends (exclusive) for this customer. Must be at 0:00 UTC (midnight).
	VoidInvoices       bool   `json:"void_invoices"`           // If true, plan end date can be before the last finalized invoice date. Any invoices generated after the plan end date will be voided.
	VoidStripeInvoices bool   `json:"void_stripe_invoices"`    // Will void Stripe invoices if VoidInvoices is set to true. Drafts will be deleted.
}

// ListCreditGrantsRequest is the request to list a user's credit grants
type ListCreditGrantsRequest struct {
	// An array of credit type IDs. This must not be specified if
	// credit_grant_ids is specified.
	CreditTypeIDs []uuid.UUID `json:"credit_type_ids,omitempty"`
	// An array of Metronome customer IDs. This must not be specified if
	// credit_grant_ids is specified.
	CustomerIDs []uuid.UUID `json:"customer_ids,omitempty"`
	// An array of credit grant IDs. If this is specified, neither
	// credit_type_ids nor customer_ids may be specified.
	CreditGrantIDs []uuid.UUID `json:"credit_grant_ids,omitempty"`
	// Only return credit grants that expire at or after this RFC 3339 timestamp.
	NotExpiringBefore string `json:"not_expiring_before,omitempty"`
	// Only return credit grants that are effective before this RFC 3339 timestamp
	// (exclusive).
	EffectiveBefore string `json:"effective_before,omitempty"`
}

// ListCreditGrantsResponse is the response returned by the list credit grants request
type ListCreditGrantsResponse struct {
	Data []CreditGrant `json:"data"`
}

// CreditType is the type of the credit used in the credit grant
type CreditType struct {
	Name string `json:"name"` // The name of the credit type
	ID   string `json:"id"`   // The UUID of the credit type
}

// GrantAmount represents the amount of credits granted
type GrantAmount struct {
	Amount     int64      `json:"amount"`      // The amount of credits granted
	CreditType CreditType `json:"credit_type"` // The credit type for the amount granted
}

// Balance represents the effective balance of the grant as of the end of the customer's
// current billing period.
type Balance struct {
	ExcludingPending int64  `json:"excluding_pending"` // The grant's current balance excluding all pending deductions.
	IncludingPending int64  `json:"including_pending"` // The grant's current balance including all posted and pending deductions.
	EffectiveAt      string `json:"effective_at"`      // The end date of the customer's current billing period in RFC 3339 format.
}

// CreditGrant is a grant given to a specific user on a specific plan
type CreditGrant struct {
	ID          uuid.UUID `json:"id"`
	Name        string
	CustomerID  uuid.UUID
	GrantAmount GrantAmount
	Balance     Balance
}
