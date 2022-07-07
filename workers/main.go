package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/go-chi/chi"
	"github.com/go-chi/chi/middleware"
	"github.com/porter-dev/porter/internal/worker"
	"github.com/porter-dev/porter/workers/jobs"
)

var (
	MaxWorkers = os.Getenv("MAX_WORKERS")
	MaxQueue   = os.Getenv("MAX_QUEUE")

	jobQueue chan worker.Job
)

func main() {
	workerCount, err := strconv.Atoi(MaxWorkers)
	if err != nil {
		log.Default().Fatalln("invalid MAX_WORKERS value")
	}

	log.Default().Printf("setting max worker count to: %d\n", workerCount)

	queueCount, err := strconv.Atoi(MaxQueue)
	if err != nil {
		log.Default().Fatalln("invalid MAX_QUEUE value")
	}

	log.Default().Printf("setting max job queue count to: %d\n", queueCount)

	jobQueue = make(chan worker.Job, queueCount)
	d := worker.NewDispatcher(workerCount)

	log.Default().Println("starting worker dispatcher")

	err = d.Run(jobQueue)

	if err != nil {
		log.Default().Fatalln(err)
	}

	server := &http.Server{Addr: ":3000", Handler: httpService()}

	serverCtx, serverStopCtx := context.WithCancel(context.Background())

	sig := make(chan os.Signal, 1)
	signal.Notify(sig, syscall.SIGHUP, syscall.SIGINT, syscall.SIGTERM, syscall.SIGQUIT)
	go func() {
		<-sig

		log.Default().Println("shutting down server")

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

		log.Default().Println("server shutdown completed")

		serverStopCtx()
	}()

	log.Default().Println("starting HTTP server at :3000")

	err = server.ListenAndServe()
	if err != nil && err != http.ErrServerClosed {
		log.Default().Fatalf("error starting HTTP server: %v", err)
	}

	// Wait for server context to be stopped
	<-serverCtx.Done()

	d.Exit()
}

func httpService() http.Handler {
	log.Default().Println("setting up HTTP router and adding middleware")

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Heartbeat("/ping"))
	r.Use(middleware.AllowContentType("application/json"))

	log.Default().Println("setting up HTTP POST endpoint to enqueue jobs")

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
		return jobs.NewHelmRevisionsCountTracker(time.Now().UTC())
	}

	return nil
}
