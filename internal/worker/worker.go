package worker

import (
	"log"
	"time"

	"github.com/google/uuid"
)

// Job is an interface which should be implemented by an individual
// worker process in order to be enqueued in the worker pool
type Job interface {
	// The unique string ID of a job
	ID() string

	// The time in UTC when a job was enqueued to the worker pool queue
	EnqueueTime() time.Time

	// The main logic and control of a job
	Run() error

	// To set external data if a job needs it
	SetData([]byte)
}

// Worker handles a single job or worker process
type Worker struct {
	exitChan chan bool
	uuid     uuid.UUID

	WorkerPool chan chan Job
	JobChannel chan Job
}

// NewWorker creates a new instance of Worker with the given
// RFC 4122 UUID and a global worker pool
func NewWorker(uuid uuid.UUID, workerPool chan chan Job) *Worker {
	return &Worker{
		exitChan: make(chan bool),
		uuid:     uuid,

		WorkerPool: workerPool,
		JobChannel: make(chan Job),
	}
}

// Start spawns a goroutine to add itself to the global worker pool
// and listens for incoming jobs as they come, in random order
func (w *Worker) Start() {
	go func() {
		for {
			w.WorkerPool <- w.JobChannel

			select {
			case job := <-w.JobChannel:
				log.Printf("attempting to run job ID '%s' via worker '%s'", job.ID(), w.uuid.String())

				if err := job.Run(); err != nil {
					log.Printf("error running job %s: %s", job.ID(), err.Error())
				}
			case <-w.exitChan:
				log.Printf("quitting worker with UUID: %v", w.uuid)

				return
			}
		}
	}()
}

// Stop instructs the worker to stop listening for incoming jobs
func (w *Worker) Stop() {
	w.exitChan <- true
}
