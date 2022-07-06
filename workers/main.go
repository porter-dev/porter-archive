package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"strconv"

	"github.com/go-chi/chi"
	"github.com/go-chi/chi/middleware"
	"github.com/porter-dev/porter/internal/worker"
	"github.com/porter-dev/porter/workers/jobs"
)

var (
	MaxWorkers = os.Getenv("MAX_WORKERS")
	MaxQueue   = os.Getenv("MAX_QUEUE")
)

func main() {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	workerCount, err := strconv.Atoi(MaxWorkers)
	if err != nil {
		log.Default().Fatalln("invalid MAX_WORKERS value")
	}

	queueCount, err := strconv.Atoi(MaxQueue)
	if err != nil {
		log.Default().Fatalln("invalid MAX_QUEUE value")
	}

	jobQueue := make(chan worker.Job, queueCount)

	d := worker.NewDispatcher(workerCount)
	d.Run(ctx, jobQueue)

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Heartbeat("/ping"))
	r.Use(middleware.AllowContentType("application/json"))

	r.Post("/enqueue/{id}", func(w http.ResponseWriter, r *http.Request) {
		job := getJob(chi.URLParam(r, "id"))

		if job == nil {
			w.WriteHeader(http.StatusNotFound)
			return
		}

		jobQueue <- job
		w.WriteHeader(http.StatusCreated)
	})

	http.ListenAndServe(":3000", r)
}

func getJob(id string) worker.Job {
	if id == "helm-release-tracker" {
		return &jobs.HelmReleaseTracker{}
	}

	return nil
}
