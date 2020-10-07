package main

import (
	"fmt"
	"log"
	"net/http"

	"github.com/gorilla/sessions"
	"github.com/porter-dev/porter/internal/repository/gorm"

	"github.com/porter-dev/porter/server/api"

	adapter "github.com/porter-dev/porter/internal/adapter"
	sessionstore "github.com/porter-dev/porter/internal/auth"
	"github.com/porter-dev/porter/internal/config"
	lr "github.com/porter-dev/porter/internal/logger"
	vr "github.com/porter-dev/porter/internal/validator"
	"github.com/porter-dev/porter/server/router"
)

func main() {
	appConf := config.FromEnv()

	logger := lr.NewConsole(appConf.Debug)
	db, err := adapter.New(&appConf.Db)

	if err != nil {
		logger.Fatal().Err(err).Msg("")
		return
	}

	repo := gorm.NewRepository(db)

	// declare as Store interface (methods Get, New, Save)
	var store sessions.Store
	store, _ = sessionstore.NewStore(repo, appConf.Server)

	validator := vr.New()

	a := api.New(logger, repo, validator, store, appConf.Server.CookieName)

	appRouter := router.New(a, store, appConf.Server.CookieName)

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
