//go:generate swagger generate spec

package main

import (
	"errors"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/porter-dev/porter/api/server/router"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/config/loader"
	"github.com/porter-dev/porter/internal/models"
	"gorm.io/gorm"
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

	cl := loader.NewEnvLoader(Version)

	config, err := cl.LoadConfig()

	if err != nil {
		log.Fatal("Config loading failed: ", err)
	}

	err = initData(config)

	if err != nil {
		log.Fatal("Data initialization failed: ", err)
	}

	appRouter := router.NewAPIRouter(config)

	address := fmt.Sprintf(":%d", config.ServerConf.Port)

	config.Logger.Info().Msgf("Starting server %v", address)

	s := &http.Server{
		Addr:         address,
		Handler:      appRouter,
		ReadTimeout:  config.ServerConf.TimeoutRead,
		WriteTimeout: config.ServerConf.TimeoutWrite,
		IdleTimeout:  config.ServerConf.TimeoutIdle,
	}

	if err := s.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		config.Logger.Fatal().Err(err).Msg("Server startup failed")
	}
}

const defaultProjectName = "default"
const defaultClusterName = "cluster-1"

func initData(conf *config.Config) error {
	// if the config specifies in-cluster connections are permitted, create a new project with a
	// cluster that uses the in-cluster config. this will be the default project for this instance.
	if conf.ServerConf.InitInCluster {
		l := conf.Logger
		l.Debug().Msg("in-cluster config variable set: checking for default project and cluster")

		// look for a project with id 1 with name of defaultProjectName
		_, err := conf.Repo.Project().ReadProject(1)

		if err != nil && errors.Is(err, gorm.ErrRecordNotFound) {
			l.Debug().Msg("default project not found: attempting creation")

			_, err = conf.Repo.Project().CreateProject(&models.Project{
				Name: defaultProjectName,
			})

			if err != nil {
				return err
			}

			l.Debug().Msg("successfully created default project")
		} else if err != nil {
			return err
		}

		_, err = conf.Repo.Cluster().ReadCluster(1, 1)

		if err != nil && errors.Is(err, gorm.ErrRecordNotFound) {
			l.Debug().Msg("default cluster not found: attempting creation")

			_, err = conf.Repo.Cluster().CreateCluster(&models.Cluster{
				Name:          defaultClusterName,
				AuthMechanism: models.InCluster,
				ProjectID:     1,
			})

			if err != nil {
				return err
			}

			l.Debug().Msg("successfully created default cluster")
		} else if err != nil {
			return err
		}
	}

	return nil
}
