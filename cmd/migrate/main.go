package main

import (
	"fmt"

	adapter "github.com/porter-dev/porter/internal/adapter"
	"github.com/porter-dev/porter/internal/config"
	lr "github.com/porter-dev/porter/internal/logger"
	"github.com/porter-dev/porter/internal/models"
)

func main() {
	fmt.Println("running migrations...")

	appConf := config.FromEnv()

	logger := lr.NewConsole(true)
	db, err := adapter.New(&appConf.Db)

	if err != nil {
		logger.Fatal().Err(err).Msg("")
		return
	}

	err = db.AutoMigrate(
		&models.User{},
		&models.ClusterConfig{},
		&models.Session{},
	)

	if err != nil {
		panic(err)
	}
}
