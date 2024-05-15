package billing

// Manager contains methods for managing billing for a project
type Manager struct {
	StripeClient       StripeClient
	StripeConfigLoaded bool
	LagoClient         LagoClient
	LagoConfigLoaded   bool
}
