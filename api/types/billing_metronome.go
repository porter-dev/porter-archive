package types

import "github.com/google/uuid"

// Customer represents a customer in Metronome
type Customer struct {
	ID   uuid.UUID `json:"id"`
	Name string    `json:"name"`
	// Aliases are alternative ids that can be used to refer to this customer in usage events
	Aliases       []string          `json:"ingest_aliases"`
	BillingConfig BillingConfig     `json:"billing_config,omitempty"`
	CustomFields  map[string]string `json:"custom_fields,omitempty"`
}

// CustomerArchiveRequest will archive the customer in Metronome.
type CustomerArchiveRequest struct {
	CustomerID uuid.UUID `json:"id"`
}

// BillingConfig is the configuration for the billing provider (Stripe, etc.)
type BillingConfig struct {
	// BillingProviderType is the name of the billing provider (e.g. )
	BillingProviderType       string `json:"billing_provider_type"`
	BillingProviderCustomerID string `json:"billing_provider_customer_id"`
	// StripeCollectionMethod defines if invoices are charged automatically or sent to customers
	StripeCollectionMethod string `json:"stripe_collection_method"`
}

// AddCustomerPlanRequest represents a request to add a customer plan with specific details.
type AddCustomerPlanRequest struct {
	PlanID uuid.UUID `json:"plan_id"`
	// StartingOn is a RFC3339 timestamp for when the plan becomes active for this customer. Must be at 0:00 UTC (midnight)
	StartingOnUTC string `json:"starting_on"`
	// EndingBeforeUTC is a RFC 3339 timestamp for when the plan ends (exclusive) for this customer. Must be at 0:00 UTC (midnight)
	EndingBeforeUTC string `json:"ending_before,omitempty"`
	// NetPaymentTermsDays is the number of days after issuance of invoice after which the invoice is due
	NetPaymentTermsDays int `json:"net_payment_terms_days,omitempty"`
}

// EndCustomerPlanRequest represents a request to end the plan for a specific customer.
type EndCustomerPlanRequest struct {
	// EndingBeforeUTC is a RFC 3339 timestamp for when the plan ends (exclusive) for this customer. Must be at 0:00 UTC (midnight).
	EndingBeforeUTC string `json:"ending_before,omitempty"`
	// VoidInvoices determines if Metronome invoices are voided. If set to true, the plan end date can be before the last finalized invoice date.
	// and any invoices generated after the plan end date will be voided.
	VoidInvoices bool `json:"void_invoices"`
	// VoidStripeInvoices determines if Stripe invoices are void (if VoidInvoices is set to true). Drafts will be deleted.
	VoidStripeInvoices bool `json:"void_stripe_invoices"`
}

// ListCreditGrantsRequest is the request to list a user's credit grants. Note that only one of
// CreditTypeIDs, CustomerIDs, or CreditGrantIDs must be specified.
type ListCreditGrantsRequest struct {
	CreditTypeIDs  []uuid.UUID `json:"credit_type_ids,omitempty"`
	CustomerIDs    []uuid.UUID `json:"customer_ids,omitempty"`
	CreditGrantIDs []uuid.UUID `json:"credit_grant_ids,omitempty"`
	// NotExpiringBefore will return grants that expire at or after this RFC 3339 timestamp.
	NotExpiringBefore string `json:"not_expiring_before,omitempty"`
	// EffectiveBefore will return grants that are effective before this RFC 3339 timestamp (exclusive).
	EffectiveBefore string `json:"effective_before,omitempty"`
}

// CreditType is the type of the credit used in the credit grant
type CreditType struct {
	Name string `json:"name"`
	ID   string `json:"id"`
}

// GrantAmount represents the amount of credits granted
type GrantAmount struct {
	Amount     int64      `json:"amount"`
	CreditType CreditType `json:"credit_type"`
}

// Balance represents the effective balance of the grant as of the end of the customer's
// current billing period.
type Balance struct {
	// ExcludingPending is the grant's current balance excluding pending deductions
	ExcludingPending int64 `json:"excluding_pending"`
	// IncludingPending is the grant's current balance including pending deductions
	IncludingPending int64 `json:"including_pending"`
	// EffectiveAt is a RFC3339 timestamp that can be used to filter credit grants by effective date
	EffectiveAt string `json:"effective_at"`
}

// CreditGrant is a grant given to a specific user on a specific plan
type CreditGrant struct {
	ID          uuid.UUID `json:"id"`
	Name        string
	CustomerID  uuid.UUID
	GrantAmount GrantAmount
	Balance     Balance
}
