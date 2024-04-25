package billing

// Manager contains methods for managing billing for a project
type Manager struct {
	StripeClient          StripeClient
	StripeConfigLoaded    bool
	MetronomeClient       MetronomeClient
	MetronomeConfigLoaded bool
}
