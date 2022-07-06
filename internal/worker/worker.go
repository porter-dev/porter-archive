package worker

import (
	"context"
	"log"
)

type Job interface {
	ID() string
	Run() error
}

type Worker struct {
	WorkerPool chan chan Job
	JobChannel chan Job
	ctx        context.Context
}

func NewWorker(ctx context.Context, workerPool chan chan Job) Worker {
	return Worker{
		WorkerPool: workerPool,
		JobChannel: make(chan Job),
		ctx:        ctx,
	}
}

func (w Worker) Start() {
	go func() {
		for {
			w.WorkerPool <- w.JobChannel

			select {
			case job := <-w.JobChannel:
				if err := job.Run(); err != nil {
					log.Default().Printf("error running job %s: %s", job.ID(), err.Error())
				}
			case <-w.ctx.Done():
				return
			}
		}
	}()
}
