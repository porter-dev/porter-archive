package gorm

import (
	"fmt"
	"os"
	"strconv"

	"github.com/porter-dev/porter/internal/config"
	"gorm.io/driver/postgres"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// New returns a new gorm database instance
func New(conf *config.DBConf) (*gorm.DB, error) {
	dsn := fmt.Sprintf(
		"user=%s password=%s port=%d host=%s sslmode=disable",
		conf.Username,
		conf.Password,
		conf.Port,
		conf.Host,
	)

	if auth, _ := strconv.ParseBool(os.Getenv("ENABLE_AUTH")); auth {
		return gorm.Open(postgres.Open(dsn), &gorm.Config{})
	} else {
		return gorm.Open(sqlite.Open("./internal/porter.db"), &gorm.Config{})
	}

}
