package gorm

import (
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// New returns a new gorm database instance
// TODO -- accept config to generate connection
func New() (*gorm.DB, error) {
	dsn := "user=porter password=porter dbname=porter port=5432 host=postgres sslmode=disable"

	return gorm.Open(postgres.Open(dsn), &gorm.Config{})
}
