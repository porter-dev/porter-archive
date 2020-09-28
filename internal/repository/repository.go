package repository

// Repository collects the repositories for each model
type Repository struct {
	User    UserRepository
	Session SessionRepository
}
