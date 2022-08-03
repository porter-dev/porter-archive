package main

import (
	"log"

	"github.com/porter-dev/porter/api/server/shared/config/envloader"
	"github.com/porter-dev/porter/cmd/migrate/keyrotate"
	"github.com/porter-dev/porter/cmd/migrate/stable_source_config_id_population"

	adapter "github.com/porter-dev/porter/internal/adapter"
	"github.com/porter-dev/porter/internal/repository/gorm"
	lr "github.com/porter-dev/porter/pkg/logger"

	"github.com/joeshaw/envdecode"
)

func main() {
	logger := lr.NewConsole(true)
	logger.Info().Msg("running migrations")

	envConf, err := envloader.FromEnv()

	if err != nil {
		logger.Fatal().Err(err).Msg("could not load env conf")
		return
	}

	db, err := adapter.New(envConf.DBConf)

	if err != nil {
		logger.Fatal().Err(err).Msg("could not connect to the database")
		return
	}

	err = gorm.AutoMigrate(db, envConf.ServerConf.Debug)

	if err != nil {
		logger.Fatal().Err(err).Msg("gorm auto-migration failed")
		return
	}

	if err := db.Raw("ALTER TABLE clusters DROP CONSTRAINT IF EXISTS fk_cluster_token_caches").Error; err != nil {
		logger.Fatal().Err(err).Msg("failed to drop cluster token cache constraint")
		return
	}
	if err := db.Raw("ALTER TABLE cluster_token_caches DROP CONSTRAINT IF EXISTS fk_clusters_token_cache").Error; err != nil {
		logger.Fatal().Err(err).Msg("failed to drop clusters token cache constraint")
		return
	}

	if shouldRotate, oldKeyStr, newKeyStr := shouldKeyRotate(); shouldRotate {
		oldKey := [32]byte{}
		newKey := [32]byte{}

		copy(oldKey[:], []byte(oldKeyStr))
		copy(newKey[:], []byte(newKeyStr))

		err := keyrotate.Rotate(db, &oldKey, &newKey)

		if err != nil {
			logger.Fatal().Err(err).Msg("key rotation failed")
		}
	}

	if shouldPopulateStableSourceConfigId() {
		stable_source_config_id_population.PopulateStableSourceConfigId(db)
	}

	if err := InstanceMigrate(db, envConf.DBConf); err != nil {
		logger.Fatal().Err(err).Msg("vault migration failed")
	}
}

type RotateConf struct {
	// we add a dummy field to avoid empty struct issue with envdecode
	DummyField       string `env:"ASDF,default=asdf"`
	OldEncryptionKey string `env:"OLD_ENCRYPTION_KEY"`
	NewEncryptionKey string `env:"NEW_ENCRYPTION_KEY"`
}

func shouldKeyRotate() (bool, string, string) {
	var c RotateConf

	if err := envdecode.StrictDecode(&c); err != nil {
		log.Fatalf("Failed to decode migration conf: %s", err)
		return false, "", ""
	}

	return c.OldEncryptionKey != "" && c.NewEncryptionKey != "", c.OldEncryptionKey, c.NewEncryptionKey
}

type StableSourcePopulateConf struct {
        // we add a dummy field to avoid empty struct issue with envdecode
	DummyField       string `env:"ASDF,default=asdf"`
	
	// Simple env variable that will let us know if we should populate the stable_source_config_id column
	POPULATE_SOURCE_CONFIG_ID bool `env:"POPULATE_SOURCE_CONFIG_ID"`
}

func shouldPopulateStableSourceConfigId() bool {
	var c StableSourcePopulateConf

	if err := envdecode.StrictDecode(&c); err != nil {
		log.Fatalf("Failed to decode migration conf: %s", err)
		return false
	}

	return c.POPULATE_SOURCE_CONFIG_ID
}
