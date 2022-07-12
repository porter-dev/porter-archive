package worker

import (
	"log"
	"time"

	"github.com/google/uuid"
)

type Job interface {
	ID() string
	EnqueueTime() time.Time
	Run() error
	SetData([]byte)
}

type Worker struct {
	exitChan chan bool
	uuid     uuid.UUID

	WorkerPool chan chan Job
	JobChannel chan Job
}

func NewWorker(uuid uuid.UUID, workerPool chan chan Job) *Worker {
	return &Worker{
		exitChan: make(chan bool),
		uuid:     uuid,

		WorkerPool: workerPool,
		JobChannel: make(chan Job),
	}
}

func (w *Worker) Start() {
	go func() {
		for {
			w.WorkerPool <- w.JobChannel

			select {
			case job := <-w.JobChannel:
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

func (w *Worker) Stop() {
	w.exitChan <- true
}
