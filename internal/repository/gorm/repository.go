package gorm

import (
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

// NewRepository returns a Repository which uses
// gorm.DB for querying the database
func NewRepository(db *gorm.DB) *repository.Repository {
	return &repository.Repository{
		User:           NewUserRepository(db),
		Session:        NewSessionRepository(db),
		Project:        NewProjectRepository(db),
		ServiceAccount: NewServiceAccountRepository(db),
	}
}
