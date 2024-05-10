package types

// ListCreditGrantsResponse returns the total remaining and granted credits for a customer.
type ListCreditGrantsResponse struct {
	RemainingBalanceCents int `json:"remaining_credits"`
	GrantedBalanceCents   int `json:"granted_credits"`
}

// ListCustomerUsageRequest is the request to list usage for a customer
type ListCustomerUsageRequest struct {
	CurrentPeriod bool `json:"current_period,omitempty"`
}

// Usage is the aggregated usage for a customer
type Usage struct {
	FromDatetime     string        `json:"from_datetime"`
	ToDatetime       string        `json:"to_datetime"`
	TotalAmountCents int64         `json:"total_amount_cents"`
	ChargesUsage     []ChargeUsage `json:"charges_usage"`
}

// ChargeUsage is the usage for a charge
type ChargeUsage struct {
	Units          string         `json:"units"`
	AmountCents    int64          `json:"amount_cents"`
	AmountCurrency string         `json:"amount_currency"`
	BillableMetric BillableMetric `json:"billable_metric"`
}

// BillableMetric is the metric collected for billing
type BillableMetric struct {
	Name string `json:"name"`
}

// Plan is the plan for a customer
type Plan struct {
	ID           string `json:"id"`
	CustomerID   string `json:"customer_id"`
	StartingOn   string `json:"starting_on"`
	EndingBefore string `json:"ending_before"`
	TrialInfo    Trial  `json:"trial_info,omitempty"`
}

// Trial contains the information for a trial period
type Trial struct {
	EndingBefore string `json:"ending_before"`
}

// BillingEvent represents a Metronome billing event.
type BillingEvent struct {
	CustomerID    string                 `json:"customer_id"`
	EventType     string                 `json:"event_type"`
	Properties    map[string]interface{} `json:"properties"`
	TransactionID string                 `json:"transaction_id"`
	Timestamp     string                 `json:"timestamp"`
}

// Wallet represents a customer credits wallet
type Wallet struct {
	Status                   string `json:"status"`
	BalanceCents             int    `json:"balance_cents,omitempty"`
	OngoingBalanceCents      int    `json:"ongoing_balance_cents,omitempty"`
	OngoingUsageBalanceCents int    `json:"ongoing_usage_balance_cents,omitempty"`
}
