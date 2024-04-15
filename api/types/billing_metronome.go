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
	// NetPaymentTermDays is the number of days after issuance of invoice after which the invoice is due
	NetPaymentTermDays int `json:"net_payment_terms_days,omitempty"`
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

// ListCreditGrantsResponse returns the total remaining and granted credits for a customer.
type ListCreditGrantsResponse struct {
	RemainingCredits float64 `json:"remaining_credits"`
	GrantedCredits   float64 `json:"granted_credits"`
}

// EmbeddableDashboardRequest requests an embeddable customer dashboard to Metronome
type EmbeddableDashboardRequest struct {
	// CustomerID is the id of the customer
	CustomerID uuid.UUID `json:"customer_id,omitempty"`
	// DashboardType is the type of dashboard to retrieve
	DashboardType string `json:"dashboard"`
	// Options are optional dashboard specific options
	Options []DashboardOption `json:"dashboard_options,omitempty"`
	//  ColorOverrides is an optional list of colors to override
	ColorOverrides []ColorOverride `json:"color_overrides,omitempty"`
}

// Plan is a pricing plan to which a user is currently subscribed
type Plan struct {
	ID                  uuid.UUID `json:"id"`
	PlanID              uuid.UUID `json:"plan_id"`
	PlanName            string    `json:"plan_name"`
	PlanDescription     string    `json:"plan_description"`
	StartingOn          string    `json:"starting_on"`
	EndingBefore        string    `json:"ending_before"`
	NetPaymentTermsDays int       `json:"net_payment_terms_days"`
	TrialInfo           Trial     `json:"trial_info,omitempty"`
}

// Trial contains the information for a trial period
type Trial struct {
	EndingBefore string `json:"ending_before"`
}

// CreditType is the type of the credit used in the credit grant
type CreditType struct {
	Name string `json:"name"`
	ID   string `json:"id"`
}

// GrantAmount represents the amount of credits granted
type GrantAmount struct {
	Amount     float64    `json:"amount"`
	CreditType CreditType `json:"credit_type"`
}

// Balance represents the effective balance of the grant as of the end of the customer's
// current billing period.
type Balance struct {
	// ExcludingPending is the grant's current balance excluding pending deductions
	ExcludingPending float64 `json:"excluding_pending"`
	// IncludingPending is the grant's current balance including pending deductions
	IncludingPending float64 `json:"including_pending"`
	// EffectiveAt is a RFC3339 timestamp that can be used to filter credit grants by effective date
	EffectiveAt string `json:"effective_at"`
}

// CreditGrant is a grant given to a specific user on a specific plan
type CreditGrant struct {
	ID          uuid.UUID   `json:"id"`
	Name        string      `json:"name"`
	GrantAmount GrantAmount `json:"grant_amount"`
	Balance     Balance     `json:"balance"`
	Reason      string      `json:"reason"`
	EffectiveAt string      `json:"effective_at"`
	ExpiresAt   string      `json:"expires_at"`
}

// DashboardOption are optional dashboard specific options
type DashboardOption struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}

// ColorOverride is an optional list of colors to override
type ColorOverride struct {
	Name  string `json:"name"`
	Value string `json:"value"`
}

// BillingEvent represents a Metronome billing event.
type BillingEvent struct {
	CustomerID    string                 `json:"customer_id"`
	EventType     string                 `json:"event_type"`
	Properties    map[string]interface{} `json:"properties"`
	TransactionID string                 `json:"transaction_id"`
	Timestamp     string                 `json:"timestamp"`
}
