package gorm

import (
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

type EventRepository struct {
	db *gorm.DB
}

// NewEventRepository returns a EventRepository which uses
// gorm.DB for querying the database
func NewEventRepository(db *gorm.DB) repository.EventRepository {
	return &EventRepository{db}
}
