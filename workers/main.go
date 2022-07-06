package main

import (
	"context"
	"log"
	"os"
	"strconv"

	"github.com/porter-dev/porter/internal/worker"
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

	exitChannel := make(chan bool)

	log.Default().Println("use Ctrl+C to exit")
	<-exitChannel
}
