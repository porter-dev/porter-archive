package types

// PaymentMethod is a subset of the Stripe PaymentMethod type,
// with only the fields used in the dashboard
type PaymentMethod struct {
	ID           string `json:"id"`
	DisplayBrand string `json:"display_brand"`
	Last4        string `json:"last4"`
	ExpMonth     int64  `json:"exp_month"`
	ExpYear      int64  `json:"exp_year"`
	Default      bool   `json:"is_default"`
}

// Invoice represents an invoice in the billing system.
type Invoice struct {
	// The URL to view the hosted invoice.
	HostedInvoiceURL string `json:"hosted_invoice_url"`
	// The status of the invoice.
	Status string `json:"status"`
	// RFC 3339 timestamp for when the invoice was created.
	Created string `json:"created"`
}

// ListCustomerInvoicesRequest is the request to list invoices for a customer
type ListCustomerInvoicesRequest struct {
	Status string `schema:"status"`
}
