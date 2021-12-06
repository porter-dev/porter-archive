package repository

// AllowlistRepository represents the set of queries on the
// Allowlist model
type AllowlistRepository interface {
	UserEmailExists(email string) (bool, error)
}
