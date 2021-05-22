package adapter

import (
	"fmt"
	"time"

	"github.com/porter-dev/porter/internal/config"
	"gorm.io/driver/postgres"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// New returns a new gorm database instance
func New(conf *config.DBConf) (*gorm.DB, error) {
	if conf.SQLLite {
		// we add DisableForeignKeyConstraintWhenMigrating since our sqlite does
		// not support foreign key constraints
		return gorm.Open(sqlite.Open(conf.SQLLitePath), &gorm.Config{
			DisableForeignKeyConstraintWhenMigrating: true,
			FullSaveAssociations:                     true,
		})
	}

	dsn := fmt.Sprintf(
		"user=%s password=%s port=%d host=%s",
		conf.Username,
		conf.Password,
		conf.Port,
		conf.Host,
	)

	if conf.ForceSSL {
		dsn = dsn + " sslmode=require"
	} else {
		dsn = dsn + " sslmode=disable"
	}

	res, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		FullSaveAssociations: true,
	})

	// retry the connection 3 times
	retryCount := 0
	timeout, _ := time.ParseDuration("5s")

	if err != nil {
		for {
			time.Sleep(timeout)
			res, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})

			if retryCount > 3 {
				return nil, err
			}

			if err == nil {
				return res, nil
			}

			retryCount++
		}
	}

	return res, err
}
