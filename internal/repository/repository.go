package repository

import "gorm.io/gorm"

// Repository collects the repositories for each model
type Repository struct {
	User UserRepository
}

// NewDefaultRepository returns a Repository which uses
// gorm.DB for querying the database
func NewDefaultRepository(db *gorm.DB) *Repository {
	return &Repository{
		User: *NewDefaultUserRepository(db),
	}
}
