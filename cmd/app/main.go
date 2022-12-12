//go:generate swagger generate spec

package main

import (
	"context"
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
	"github.com/porter-dev/porter/pkg/telemetry"
	"gorm.io/gorm"
)

// Version will be linked by an ldflag during build
var Version string = "dev-ce"

func main() {
	var versionFlag bool
	flag.BoolVar(&versionFlag, "version", false, "print version and exit")
	flag.Parse()

	ctx := context.Background()

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

	tc := telemetry.TracerConfig{
		ServiceName:  "porter-server",
		CollectorURL: "localhost:4317",
	}

	tp, err := telemetry.InitTracer(ctx, tc)
	if err != nil {
		log.Fatal("Unable to load telemetry: ", err)
	}
	defer func() { tp.TraceProvider.Shutdown(ctx) }()

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

		// determine if there are any clusters in the project already
		clusters, err := conf.Repo.Cluster().ListClustersByProjectID(1)

		if err != nil {
			return err
		}

		// if there are already clusters in the project, determine if any of the clusters are using an
		// in-cluster auth mechanism
		if len(clusters) > 0 {
			for _, cluster := range clusters {
				if cluster.AuthMechanism == models.InCluster {
					return nil
				}
			}
		}

		_, err = conf.Repo.Cluster().ReadCluster(1, 1)

		if err != nil && errors.Is(err, gorm.ErrRecordNotFound) {
			l.Debug().Msg("default cluster not found: attempting creation")

			_, err = conf.Repo.Cluster().CreateCluster(&models.Cluster{
				Name:                defaultClusterName,
				AuthMechanism:       models.InCluster,
				ProjectID:           1,
				MonitorHelmReleases: true,
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
