// +build ee

package main

import (
	"log"

	"github.com/joeshaw/envdecode"
	"github.com/porter-dev/porter/api/server/shared/config/env"
	"github.com/porter-dev/porter/ee/migrate"
	"gorm.io/gorm"
)

func InstanceMigrate(db *gorm.DB, dbConf *env.DBConf) error {
	if shouldVaultRotate() {
		if err := migrate.MigrateVault(db, dbConf); err != nil {
			return err
		}
	}

	return nil
}

type VaultMigrateConf struct {
	// we add a dummy field to avoid empty struct issue with envdecode
	DummyField   string `env:"ASDF,default=asdf"`
	VaultMigrate bool   `env:"VAULT_MIGRATE"`
}

func shouldVaultRotate() bool {
	var c VaultMigrateConf

	if err := envdecode.StrictDecode(&c); err != nil {
		log.Fatalf("Failed to decode Vault migration conf: %s", err)
		return false
	}

	return c.VaultMigrate
}
