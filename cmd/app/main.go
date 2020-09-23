package main

import (
	"log"
	"net/http"
	"time"

	"github.com/porter-dev/porter/server/api"

	dbConn "github.com/porter-dev/porter/internal/gorm"
	lr "github.com/porter-dev/porter/internal/logger"
	"github.com/porter-dev/porter/server/router"
)

func main() {
	logger := lr.NewConsole(true)
	db, err := dbConn.New()

	if err != nil {
		logger.Fatal().Err(err).Msg("")
		return
	}

	a := api.New(logger, db)

	appRouter := router.New(a)

	logger.Info().Msgf("Starting server %v", "8080")

	s := &http.Server{
		Addr:         ":8080",
		Handler:      appRouter,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	if err := s.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatal("Server startup failed")
	}
}
