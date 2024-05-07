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
	// Trial is the trial period for the plan
	Trial *TrialSpec `json:"trial_spec,omitempty"`
}

// TrialSpec is the trial period for the plan
type TrialSpec struct {
	LengthInDays int64 `json:"length_in_days"`
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

// CreateCreditsGrantRequest is the request to create a credit grant for a customer
type CreateCreditsGrantRequest struct {
	// CustomerID is the id of the customer
	CustomerID    uuid.UUID     `json:"customer_id"`
	UniquenessKey string        `json:"uniqueness_key"`
	GrantAmount   GrantAmountID `json:"grant_amount"`
	PaidAmount    PaidAmount    `json:"paid_amount"`
	Name          string        `json:"name"`
	ExpiresAt     string        `json:"expires_at"`
	Priority      int           `json:"priority"`
	Reason        string        `json:"reason"`
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
	RemainingBalanceCents int `json:"remaining_credits"`
	GrantedBalanceCents   int `json:"granted_credits"`
}

// ListCustomerUsageRequest is the request to list usage for a customer
type ListCustomerUsageRequest struct {
	CustomerID       uuid.UUID `json:"customer_id"`
	BillableMetricID uuid.UUID `json:"billable_metric_id"`
	WindowSize       string    `json:"window_size"`
	StartingOn       string    `json:"starting_on,omitempty"`
	EndingBefore     string    `json:"ending_before,omitempty"`
	CurrentPeriod    bool      `json:"current_period,omitempty"`
}

// Usage is the aggregated usage for a customer
type Usage struct {
	MetricName   string                `json:"metric_name"`
	UsageMetrics []CustomerUsageMetric `json:"usage_metrics"`
}

// CustomerUsageMetric is a metric representing usage for a customer
type CustomerUsageMetric struct {
	StartingOn   string  `json:"starting_on"`
	EndingBefore string  `json:"ending_before"`
	Value        float64 `json:"value"`
}

// BillableMetric is defined in Metronome and represents the events that will
// be ingested
type BillableMetric struct {
	ID   uuid.UUID `json:"id"`
	Name string    `json:"name"`
}

// ListCustomerCostsRequest is the request to list costs for a customer
type ListCustomerCostsRequest struct {
	StartingOn   string `schema:"starting_on"`
	EndingBefore string `schema:"ending_before"`
	Limit        int    `schema:"limit"`
}

// Cost is the cost for a customer in a specific time range
type Cost struct {
	StartTimestamp string                    `json:"start_timestamp"`
	EndTimestamp   string                    `json:"end_timestamp"`
	CreditTypes    map[string]CreditTypeCost `json:"credit_types"`
}

// CreditTypeCost is the cost for a specific credit type (e.g. CPU hours)
type CreditTypeCost struct {
	Name              string                  `json:"name"`
	Cost              float64                 `json:"cost"`
	LineItemBreakdown []LineItemBreakdownCost `json:"line_item_breakdown"`
}

// LineItemBreakdownCost is the cost breakdown by line item
type LineItemBreakdownCost struct {
	Name string  `json:"name"`
	Cost float64 `json:"cost"`
}

// FormattedCost is the cost for a customer in a specific time range, flattened from the Metronome response
type FormattedCost struct {
	StartTimestamp string  `json:"start_timestamp"`
	EndTimestamp   string  `json:"end_timestamp"`
	Cost           float64 `json:"cost"`
}

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

// GrantAmountID represents the amount of credits granted with the credit type ID
// for the create credits grant request
type GrantAmountID struct {
	Amount       float64   `json:"amount"`
	CreditTypeID uuid.UUID `json:"credit_type_id"`
}

// GrantAmount represents the amount of credits granted with the credit type
// for the list credit grants response
type GrantAmount struct {
	Amount     float64    `json:"amount"`
	CreditType CreditType `json:"credit_type"`
}

// PaidAmount represents the amount paid by the customer
type PaidAmount struct {
	Amount       float64   `json:"amount"`
	CreditTypeID uuid.UUID `json:"credit_type_id"`
}

// PricingUnit represents the unit of the pricing (e.g. USD, MXN, CPU hours)
type PricingUnit struct {
	ID         uuid.UUID `json:"id"`
	Name       string    `json:"name"`
	IsCurrency bool      `json:"is_currency"`
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

// BillingEvent represents a Metronome billing event.
type BillingEvent struct {
	CustomerID    string                 `json:"customer_id"`
	EventType     string                 `json:"event_type"`
	Properties    map[string]interface{} `json:"properties"`
	TransactionID string                 `json:"transaction_id"`
	Timestamp     string                 `json:"timestamp"`
}
