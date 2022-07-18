//go:build ee

package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi"
	"github.com/go-chi/chi/middleware"
	"github.com/joeshaw/envdecode"
	"github.com/porter-dev/porter/api/server/shared/config/env"
	"github.com/porter-dev/porter/internal/adapter"
	"github.com/porter-dev/porter/internal/worker"
	"github.com/porter-dev/porter/workers/jobs"
	"gorm.io/gorm"
)

var (
	jobQueue   chan worker.Job
	envDecoder = EnvConf{}
	dbConn     *gorm.DB
)

// EnvConf holds the environment variables for this binary
type EnvConf struct {
	ServerURL          string `env:"SERVER_URL,default=http://localhost:8080"`
	DOClientID         string `env:"DO_CLIENT_ID"`
	DOClientSecret     string `env:"DO_CLIENT_SECRET"`
	DBConf             env.DBConf
	MaxWorkers         uint   `env:"MAX_WORKERS,default=10"`
	MaxQueue           uint   `env:"MAX_QUEUE,default=100"`
	AWSAccessKeyID     string `env:"AWS_ACCESS_KEY_ID"`
	AWSSecretAccessKey string `env:"AWS_SECRET_ACCESS_KEY"`
	AWSRegion          string `env:"AWS_REGION"`
	S3BucketName       string `env:"S3_BUCKET_NAME"`
	EncryptionKey      string `env:"S3_ENCRYPTION_KEY"`

	Port uint `env:"PORT,default=3000"`
}

func main() {
	if err := envdecode.StrictDecode(&envDecoder); err != nil {
		log.Fatalf("Failed to decode server conf: %v", err)
	}

	log.Printf("setting max worker count to: %d\n", envDecoder.MaxWorkers)
	log.Printf("setting max job queue count to: %d\n", envDecoder.MaxQueue)

	db, err := adapter.New(&envDecoder.DBConf)

	if err != nil {
		log.Fatalln(err)
	}

	dbConn = db

	jobQueue = make(chan worker.Job, envDecoder.MaxQueue)
	d := worker.NewDispatcher(int(envDecoder.MaxWorkers))

	log.Println("starting worker dispatcher")

	err = d.Run(jobQueue)

	if err != nil {
		log.Fatalln(err)
	}

	server := &http.Server{Addr: fmt.Sprintf(":%d", envDecoder.Port), Handler: httpService()}

	serverCtx, serverStopCtx := context.WithCancel(context.Background())

	sig := make(chan os.Signal, 1)
	signal.Notify(sig, syscall.SIGHUP, syscall.SIGINT, syscall.SIGTERM, syscall.SIGQUIT)
	go func() {
		<-sig

		log.Println("shutting down server")

		shutdownCtx, shutdownCtxCancel := context.WithTimeout(serverCtx, 30*time.Second)
		defer shutdownCtxCancel()

		go func() {
			<-shutdownCtx.Done()
			if shutdownCtx.Err() == context.DeadlineExceeded {
				log.Fatal("graceful shutdown timed out.. forcing exit.")
			}
		}()

		err = server.Shutdown(shutdownCtx)

		if err != nil {
			log.Fatalln(err)
		}

		log.Println("server shutdown completed")

		serverStopCtx()
	}()

	log.Println("starting HTTP server at :3000")

	err = server.ListenAndServe()
	if err != nil && err != http.ErrServerClosed {
		log.Fatalf("error starting HTTP server: %v", err)
	}

	// Wait for server context to be stopped
	<-serverCtx.Done()

	d.Exit()
}

func httpService() http.Handler {
	log.Println("setting up HTTP router and adding middleware")

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Heartbeat("/ping"))
	r.Use(middleware.AllowContentType("application/json"))

	r.Mount("/debug", middleware.Profiler())

	log.Println("setting up HTTP POST endpoint to enqueue jobs")

	r.Post("/enqueue/{id}", func(w http.ResponseWriter, r *http.Request) {
		job := getJob(chi.URLParam(r, "id"))

		if job == nil {
			w.WriteHeader(http.StatusNotFound)
			return
		}

		jobQueue <- job
		w.WriteHeader(http.StatusCreated)
	})

	return r
}

func getJob(id string) worker.Job {
	if id == "helm-revisions-count-tracker" {
		newJob, err := jobs.NewHelmRevisionsCountTracker(dbConn, time.Now().UTC(), &jobs.HelmRevisionsCountTrackerOpts{
			DBConf:             &envDecoder.DBConf,
			DOClientID:         envDecoder.DOClientID,
			DOClientSecret:     envDecoder.DOClientSecret,
			DOScopes:           []string{"read", "write"},
			ServerURL:          envDecoder.ServerURL,
			AWSAccessKeyID:     envDecoder.AWSAccessKeyID,
			AWSSecretAccessKey: envDecoder.AWSSecretAccessKey,
			AWSRegion:          envDecoder.AWSRegion,
			S3BucketName:       envDecoder.S3BucketName,
			EncryptionKey:      envDecoder.EncryptionKey,
		})

		if err != nil {
			log.Printf("error creating job with ID: helm-revisions-count-tracker. Error: %v", err)
			return nil
		}

		return newJob
	}

	return nil
}
