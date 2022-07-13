package worker

import (
	"log"

	"github.com/google/uuid"
)

// Dispatcher is responsible to maintain a global worker pool
// and to dispatch jobs to the underlying workers, in random order
type Dispatcher struct {
	maxWorkers int
	exitChan   chan bool

	WorkerPool chan chan Job
}

// NewDispatcher creates a new instance of Dispatcher with
// the given number of workers that should be in the worker pool
func NewDispatcher(maxWorkers int) *Dispatcher {
	pool := make(chan chan Job, maxWorkers)
	return &Dispatcher{
		maxWorkers: maxWorkers,
		exitChan:   make(chan bool),

		WorkerPool: pool,
	}
}

// Run creates workers in the worker pool with the given
// job queue and starts the workers
func (d *Dispatcher) Run(jobQueue chan Job) error {
	go func() {
		var workers []*Worker

		for i := 0; i < d.maxWorkers; i += 1 {
			uuid, err := uuid.NewUUID()

			if err != nil {
				// FIXME: should let the parent thread know of this error
				log.Printf("error creating UUID for worker: %v", err)
				return
			}

			worker := NewWorker(uuid, d.WorkerPool)
			workers = append(workers, worker)

			log.Printf("starting worker with UUID: %v", uuid)

			worker.Start()
		}

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
	}()

	return nil
}

// Exit instructs the dispatcher to quit processing any more jobs
func (d *Dispatcher) Exit() {
	d.exitChan <- true
}
