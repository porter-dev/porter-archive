package main

import (
	"fmt"
	"log"

	"github.com/porter-dev/porter/api/server/shared/envloader"
	"github.com/porter-dev/porter/cmd/migrate/keyrotate"

	adapter "github.com/porter-dev/porter/internal/adapter"
	lr "github.com/porter-dev/porter/internal/logger"
	"github.com/porter-dev/porter/internal/repository/gorm"

	"github.com/joeshaw/envdecode"
)

func main() {
	logger := lr.NewConsole(true)
	fmt.Println("running migrations...")

	envConf, err := envloader.FromEnv()

	if err != nil {
		logger.Fatal().Err(err).Msg("")
		return
	}

	db, err := adapter.New(envConf.DBConf)

	if err != nil {
		logger.Fatal().Err(err).Msg("")
		return
	}

	err = gorm.AutoMigrate(db)

	if err != nil {
		logger.Fatal().Err(err).Msg("")
		return
	}

	if shouldRotate, oldKeyStr, newKeyStr := shouldKeyRotate(); shouldRotate {
		oldKey := [32]byte{}
		newKey := [32]byte{}

		copy(oldKey[:], []byte(oldKeyStr))
		copy(newKey[:], []byte(newKeyStr))

		err := keyrotate.Rotate(db, &oldKey, &newKey)

		if err != nil {
			panic(err)
		}
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
