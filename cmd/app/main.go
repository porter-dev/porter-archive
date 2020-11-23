package main

import (
	"fmt"
	"log"
	"net/http"

	"github.com/gorilla/sessions"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/oauth"
	"github.com/porter-dev/porter/internal/repository/gorm"

	"github.com/porter-dev/porter/server/api"

	"github.com/porter-dev/porter/internal/adapter"
	sessionstore "github.com/porter-dev/porter/internal/auth"
	"github.com/porter-dev/porter/internal/config"
	lr "github.com/porter-dev/porter/internal/logger"
	vr "github.com/porter-dev/porter/internal/validator"
	"github.com/porter-dev/porter/server/router"

	ints "github.com/porter-dev/porter/internal/models/integrations"
)

func main() {
	appConf := config.FromEnv()

	logger := lr.NewConsole(appConf.Debug)
	db, err := adapter.New(&appConf.Db)

	if err != nil {
		logger.Fatal().Err(err).Msg("")
		return
	}

	err = db.AutoMigrate(
		&models.Project{},
		&models.Role{},
		&models.User{},
		&models.Session{},
		&models.GitRepo{},
		&models.Cluster{},
		&models.ClusterCandidate{},
		&models.ClusterResolver{},
		&ints.KubeIntegration{},
		&ints.OIDCIntegration{},
		&ints.OAuthIntegration{},
		&ints.GCPIntegration{},
		&ints.AWSIntegration{},
		&ints.TokenCache{},
	)

	if err != nil {
		logger.Fatal().Err(err).Msg("")
		return
	}

	var key [32]byte

	for i, b := range []byte(appConf.Db.EncryptionKey) {
		key[i] = b
	}

	repo := gorm.NewRepository(db, &key)

	// declare as Store interface (methods Get, New, Save)
	var store sessions.Store
	store, _ = sessionstore.NewStore(repo, appConf.Server)

	validator := vr.New()

	a := api.New(
		logger,
		nil,
		repo,
		validator,
		store,
		appConf.Server.CookieName,
		false,
		appConf.Server.IsLocal,
		&oauth.Config{
			ClientID:     appConf.Server.GithubClientID,
			ClientSecret: appConf.Server.GithubClientSecret,
			Scopes:       []string{"repo", "user", "read:user"},
			BaseURL:      appConf.Server.ServerURL,
		},
	)

	appRouter := router.New(a, store, appConf.Server.CookieName, appConf.Server.StaticFilePath, repo)

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
		log.Fatal("Server startup failed", err)
	}
}
