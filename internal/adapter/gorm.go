package gorm

import (
	"fmt"

	"github.com/porter-dev/porter/internal/config"
	"gorm.io/driver/postgres"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// New returns a new gorm database instance
func New(conf *config.DBConf) (*gorm.DB, error) {
	if conf.SQLLite {
		return gorm.Open(sqlite.Open(conf.SQLLitePath), &gorm.Config{})
	}

	dsn := fmt.Sprintf(
		"user=%s password=%s port=%d host=%s sslmode=disable",
		conf.Username,
		conf.Password,
		conf.Port,
		conf.Host,
	)

	return gorm.Open(postgres.Open(dsn), &gorm.Config{})
}
