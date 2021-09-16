package adapter

import (
	"fmt"
	"gorm.io/gorm/logger"
	"log"
	"os"
	"time"

	"github.com/porter-dev/porter/internal/config"
	"gorm.io/driver/postgres"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// New returns a new gorm database instance
func New(conf *config.DBConf) (*gorm.DB, error) {
	logger := logger.New(
		log.New(os.Stdout, "\r\n", log.LstdFlags),
		logger.Config{
			SlowThreshold:              time.Second,
			LogLevel:                   logger.Silent,
			Colorful:                  false,
		},
	)

	if conf.SQLLite {
		// we add DisableForeignKeyConstraintWhenMigrating since our sqlite does
		// not support foreign key constraints
		return gorm.Open(sqlite.Open(conf.SQLLitePath), &gorm.Config{
			DisableForeignKeyConstraintWhenMigrating: true,
			FullSaveAssociations:                     true,
			Logger: logger,
		})
	}

	// connect to default postgres instance first
	baseDSN := fmt.Sprintf(
		"user=%s password=%s port=%d host=%s",
		conf.Username,
		conf.Password,
		conf.Port,
		conf.Host,
	)

	if conf.ForceSSL {
		baseDSN = baseDSN + " sslmode=require"
	} else {
		baseDSN = baseDSN + " sslmode=disable"
	}

	postgresDSN := baseDSN + " database=postgres"
	targetDSN := baseDSN + " database=" + conf.DbName

	defaultDB, err := gorm.Open(postgres.Open(postgresDSN), &gorm.Config{
		FullSaveAssociations: true,
		Logger: logger,
	})

	// attempt to create the database
	if conf.DbName != "" {
		defaultDB.Exec(fmt.Sprintf("CREATE DATABASE %s;", conf.DbName))
	}

	// open the database connection
	res, err := gorm.Open(postgres.Open(targetDSN), &gorm.Config{
		FullSaveAssociations: true,
		Logger: logger,
	})

	// retry the connection 3 times
	retryCount := 0
	timeout, _ := time.ParseDuration("5s")

	if err != nil {
		for {
			time.Sleep(timeout)
			res, err = gorm.Open(postgres.Open(targetDSN), &gorm.Config{
				FullSaveAssociations: true,
				Logger: logger,
			})

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
