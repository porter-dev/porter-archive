package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository/gorm"

	"github.com/porter-dev/porter/server/api"

	"github.com/porter-dev/porter/internal/adapter"
	"github.com/porter-dev/porter/internal/config"
	lr "github.com/porter-dev/porter/internal/logger"
	"github.com/porter-dev/porter/server/router"

	prov "github.com/porter-dev/porter/internal/kubernetes/provisioner"
	ints "github.com/porter-dev/porter/internal/models/integrations"
)

// Version will be linked by an ldflag during build
var Version string = "dev"

func main() {
	var versionFlag bool
	flag.BoolVar(&versionFlag, "version", false, "print version and exit")
	flag.Parse()

	// Exit safely when version is used
	if versionFlag {
		fmt.Println(Version)
		os.Exit(0)
	}

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
		&models.Registry{},
		&models.HelmRepo{},
		&models.Cluster{},
		&models.ClusterCandidate{},
		&models.ClusterResolver{},
		&models.Infra{},
		&models.GitActionConfig{},
		&models.Invite{},
		&models.AuthCode{},
		&models.DNSRecord{},
		&models.PWResetToken{},
		&ints.KubeIntegration{},
		&ints.BasicIntegration{},
		&ints.OIDCIntegration{},
		&ints.OAuthIntegration{},
		&ints.GCPIntegration{},
		&ints.AWSIntegration{},
		&ints.TokenCache{},
		&ints.ClusterTokenCache{},
		&ints.RegTokenCache{},
		&ints.HelmRepoTokenCache{},
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

	if appConf.Redis.Enabled {
		redis, err := adapter.NewRedisClient(&appConf.Redis)

		if err != nil {
			logger.Fatal().Err(err).Msg("")
			return
		}

		prov.InitGlobalStream(redis)

		errorChan := make(chan error)

		go prov.GlobalStreamListener(redis, *repo, errorChan)
	}

	a, _ := api.New(&api.AppConfig{
		Logger:     logger,
		Repository: repo,
		ServerConf: appConf.Server,
		RedisConf:  &appConf.Redis,
		DBConf:     appConf.Db,
	})

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
		log.Fatal("Server startup failed", err)
	}
}
