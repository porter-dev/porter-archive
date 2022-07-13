package worker

import (
	"fmt"
	"log"

	"github.com/google/uuid"
)

// Dispatcher is responsible to maintain a global worker pool
// and to dispatch jobs to the underlying workers, in random order
type Dispatcher struct {
	maxWorkers int
	exitChan   chan bool
	workers    []*Worker

	WorkerPool chan chan Job
}

// NewDispatcher creates a new instance of Dispatcher with
// the given number of workers hat should be in the worker pool
func NewDispatcher(maxWorkers int) *Dispatcher {
	pool := make(chan chan Job, maxWorkers)
	return &Dispatcher{
		maxWorkers: maxWorkers,
		exitChan:   make(chan bool),
		workers:    make([]*Worker, maxWorkers),

		WorkerPool: pool,
	}
}

// Run creates workers in the worker pool with the given
// job queue and starts the workers
func (d *Dispatcher) Run(jobQueue chan Job) error {
	for i := 0; i < d.maxWorkers; i += 1 {
		uuid, err := uuid.NewUUID()

		if err != nil {
			return fmt.Errorf("error creating UUID for worker: %w", err)
		}

		worker := NewWorker(uuid, d.WorkerPool)
		d.workers = append(d.workers, worker)

		log.Printf("starting worker with UUID: %v", uuid)

		worker.Start()
	}

	d.dispatch(jobQueue)

	return nil
}

// Exit instructs the dispatcher to quit processing any more jobs
func (d *Dispatcher) Exit() {
	d.exitChan <- true
}

func (d *Dispatcher) dispatch(jobQueue chan Job) {
	go func(workers []*Worker) {
		for {
			select {
			case job := <-jobQueue:
				go func() {
					workerJobChan := <-d.WorkerPool
					workerJobChan <- job
				}()
			case <-d.exitChan:
				for _, w := range workers {
					w.Stop()
				}

				return
			}
		}
	}(d.workers)
}
