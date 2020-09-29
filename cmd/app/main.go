package main

import (
	"fmt"
	"log"
	"net/http"

	"github.com/porter-dev/porter/internal/repository/gorm"

	"github.com/porter-dev/porter/server/api"

	adapter "github.com/porter-dev/porter/internal/adapter"
	sessionstore "github.com/porter-dev/porter/internal/auth/"
	"github.com/porter-dev/porter/internal/config"
	lr "github.com/porter-dev/porter/internal/logger"
	vr "github.com/porter-dev/porter/internal/validator"
	"github.com/porter-dev/porter/server/router"
)

func main() {
	appConf := config.AppConfig()

	logger := lr.NewConsole(appConf.Debug)
	db, err := adapter.New(&appConf.Db)

	if err != nil {
		logger.Fatal().Err(err).Msg("")
		return
	}

	key = []byte("secret") // TODO: change to os.Getenv("SESSION_KEY")
	store, _ = sessionstore.NewStore(db, key)

	validator := vr.New()
	repo := gorm.NewRepository(db)

	a := api.New(logger, repo, validator, store)

	appRouter := router.New(a)

	address := fmt.Sprintf(":%d", appConf.Server.Port)

	logger.Info().Msgf("Starting server %v", address)

	s := &http.Server{
		Addr:         address,
		Handler:      appRouter,
		ReadTimeout:  appConf.Server.TimeoutRead,
		WriteTimeout: appConf.Server.TimeoutWrite,
		IdleTimeout:  appConf.Server.TimeoutIdle,
	}

	if err := s.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatal("Server startup failed")
	}
}
