package main

import (
	adapter "github.com/porter-dev/porter/internal/adapter"
	lr "github.com/porter-dev/porter/internal/logger"
	"github.com/porter-dev/porter/internal/models"
)

func main() {
	logger := lr.NewConsole(true)
	db, err := adapter.New()

	if err != nil {
		logger.Fatal().Err(err).Msg("")
		return
	}

	db.AutoMigrate(
		&models.User{},
		&models.ClusterConfig{},
	)
}
