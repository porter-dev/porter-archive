package main

import (
	"log"

	"github.com/porter-dev/porter/api/server/shared/config/envloader"
	"github.com/porter-dev/porter/cmd/migrate/keyrotate"
	"github.com/porter-dev/porter/cmd/migrate/populate_source_config_display_name"

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

	if shouldPopulateSourceConfigDisplayName() {
		err := populate_source_config_display_name.PopulateSourceConfigDisplayName(db, logger)

		if err != nil {
			logger.Fatal().Err(err).Msg("failed to populate source config display name")
		}
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

type PopulateSourceConfigDisplayNameConf struct {
	// we add a dummy field to avoid empty struct issue with envdecode
	DummyField string `env:"ASDF,default=asdf"`

	// if true, will populate the display name for all source configs
	PopulateSourceConfigDisplayName bool `env:"POPULATE_SOURCE_CONFIG_DISPLAY_NAME"`
}

func shouldPopulateSourceConfigDisplayName() bool {
	var c PopulateSourceConfigDisplayNameConf

	if err := envdecode.StrictDecode(&c); err != nil {
		log.Fatalf("Failed to decode migration conf: %s", err)
		return false
	}

	return c.PopulateSourceConfigDisplayName
}
