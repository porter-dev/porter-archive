// +build !ee

package main

import (
	"fmt"

	"github.com/porter-dev/porter/api/server/shared/config/env"
	"gorm.io/gorm"
)

func InstanceMigrate(db *gorm.DB, dbConf *env.DBConf) error {
	fmt.Println("HIT CE EDITION")

	return nil
}
