package worker

import (
	"fmt"
	"log"

	"github.com/google/uuid"
)

type Dispatcher struct {
	maxWorkers int
	exitChan   chan bool
	workers    []*Worker

	WorkerPool chan chan Job
}

func NewDispatcher(maxWorkers int) *Dispatcher {
	pool := make(chan chan Job, maxWorkers)
	return &Dispatcher{
		maxWorkers: maxWorkers,
		exitChan:   make(chan bool),
		workers:    make([]*Worker, maxWorkers),

		WorkerPool: pool,
	}
}

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

func (d *Dispatcher) Exit() {
	d.exitChan <- true
}

func (d *Dispatcher) dispatch(jobQueue chan Job) {
	go func(workers []*Worker) {
		for {
			select {
			case job := <-jobQueue:
				go func(job Job) {
					jobChannel := <-d.WorkerPool

					jobChannel <- job
				}(job)
			case <-d.exitChan:
				for _, w := range workers {
					w.Stop()
				}

				return
			}
		}
	}(d.workers)
}
