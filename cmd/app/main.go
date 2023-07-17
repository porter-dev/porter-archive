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
	"os/signal"
	"syscall"

	"github.com/porter-dev/porter/api/server"

	"github.com/porter-dev/porter/api/authmanagement"

	"golang.org/x/sync/errgroup"

	"github.com/porter-dev/porter/internal/telemetry"

	"github.com/porter-dev/porter/api/server/router"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/config/loader"
	"github.com/porter-dev/porter/internal/models"
	"gorm.io/gorm"
)

// Version will be linked by an ldflag during build
var Version string = "dev-ce"

func main() {
	g, ctx := errgroup.WithContext(context.Background())
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	var versionFlag, authServiceFlag bool
	flag.BoolVar(&versionFlag, "version", false, "print version and exit")
	flag.BoolVar(&authServiceFlag, "auth", false, "run auth service in addition to porter api")
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

	config.Logger.Info().Msg("Initializing data")
	err = initData(config)
	if err != nil {
		log.Fatal("Data initialization failed: ", err)
	}
	config.Logger.Info().Msg("Initialed data")

	tracer, err := telemetry.InitTracer(ctx, config.TelemetryConfig)
	if err != nil {
		config.Logger.Fatal().Err(err).Msg("Error initializing telemetry")
	}
	defer tracer.Shutdown()

	config.Logger.Info().Msg("Creating API router")
	appRouter := router.NewAPIRouter(config)
	config.Logger.Info().Msg("Created API router")

	p := server.PorterAPIServer{
		Port:       config.ServerConf.Port,
		Router:     appRouter,
		ServerConf: config.ServerConf,
	}

	g.Go(func() error {
		config.Logger.Info().Msgf("Starting PorterAPI server on port %d", config.ServerConf.Port)
		if err := p.ListenAndServe(ctx); err != nil && err != http.ErrServerClosed {
			return fmt.Errorf("PorterAPI server failed: %s", err.Error())
		}
		config.Logger.Info().Msg("Shutting down PorterAPI server")
		return nil
	})

	if authServiceFlag {
		g.Go(func() error {
			a, err := authmanagement.NewService()
			if err != nil {
				return fmt.Errorf("failed to initialize AuthManagement server: %s", err.Error())
			}

			config.Logger.Info().Msgf("Starting AuthManagement server on port %d", a.Config.Port)
			if err := a.ListenAndServe(ctx); err != nil && err != http.ErrServerClosed {
				return fmt.Errorf("AuthManagement server failed: %s", err.Error())
			}
			config.Logger.Info().Msg("Shutting down AuthManagement server")
			return nil
		})
	}

	termFunc := func() error {
		termChan := make(chan os.Signal, 1)
		signal.Notify(termChan, syscall.SIGINT, syscall.SIGTERM)

		select {
		case <-termChan:
			config.Logger.Info().Msg("Process shutdown signal received")
			cancel()
			return nil
		case <-ctx.Done():
			return nil
		}
	}

	g.Go(termFunc)

	err = g.Wait()
	if err != nil {
		config.Logger.Fatal().Err(err).Msg("Received server error")
	}
}

const (
	defaultProjectName = "default"
	defaultClusterName = "cluster-1"
)

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
