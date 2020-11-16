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
		&models.Project{},
		&models.Role{},
		&models.ServiceAccount{},
		&models.ServiceAccountAction{},
		&models.ServiceAccountCandidate{},
		&models.Cluster{},
		&models.TokenCache{},
		&models.User{},
		&models.Session{},
		&models.RepoClient{},
	)

	if err != nil {
		panic(err)
	}
}
