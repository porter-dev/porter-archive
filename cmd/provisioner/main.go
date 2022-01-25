package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/porter-dev/porter/provisioner/server/config"
	"github.com/porter-dev/porter/provisioner/server/router"
)

// Version will be linked by an ldflag during build
var Version string = "dev-ce"

func main() {
	var versionFlag bool
	flag.BoolVar(&versionFlag, "version", false, "print version and exit")
	flag.Parse()

	// Exit safely when version is used
	if versionFlag {
		fmt.Println(Version)
		os.Exit(0)
	}

	envConf, err := config.FromEnv()

	if err != nil {
		log.Fatal("Environment loading failed: ", err)
	}

	config, err := config.GetConfig(envConf)

	if err != nil {
		log.Fatal("Config loading failed: ", err)
	}

	appRouter := router.NewAPIRouter(config)

	// if config.RedisConf.Enabled {
	// 	redis, err := adapter.NewRedisClient(config.RedisConf)

	// 	if err != nil {
	// 		config.Logger.Fatal().Err(err).Msg("redis connection failed")
	// 		return
	// 	}

	// 	redis_stream.InitGlobalStream(redis)

	// 	errorChan := make(chan error)

	// 	go redis_stream.GlobalStreamListener(redis, config, config.Repo, config.AnalyticsClient, errorChan)
	// }

	address := fmt.Sprintf(":%d", config.ProvisionerConf.Port)

	config.Logger.Info().Msgf("Starting server %v", address)

	s := &http.Server{
		Addr:         address,
		Handler:      appRouter,
		ReadTimeout:  config.ProvisionerConf.TimeoutRead,
		WriteTimeout: config.ProvisionerConf.TimeoutWrite,
		IdleTimeout:  config.ProvisionerConf.TimeoutIdle,
	}

	if err := s.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		config.Logger.Fatal().Err(err).Msg("Server startup failed")
	}
}
