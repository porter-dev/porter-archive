// +build !ee

package main

import (
	"github.com/porter-dev/porter/api/server/shared/config/env"
	"gorm.io/gorm"
)

func InstanceMigrate(db *gorm.DB, dbConf *env.DBConf) error {
	return nil
}
