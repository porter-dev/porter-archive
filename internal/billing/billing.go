package billing

// Manager contains methods for managing billing for a project
type Manager struct {
	StripeClient    *StripeClient
	MetronomeClient *MetronomeClient
}
