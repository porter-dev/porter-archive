package worker

import "context"

type Dispatcher struct {
	ctx        context.Context
	maxWorkers int
	WorkerPool chan chan Job
}

func NewDispatcher(maxWorkers int) *Dispatcher {
	pool := make(chan chan Job, maxWorkers)
	return &Dispatcher{
		maxWorkers: maxWorkers,
		WorkerPool: pool,
	}
}

func (d *Dispatcher) Run(ctx context.Context, jobQueue chan Job) {
	for i := 0; i < d.maxWorkers; i += 1 {
		worker := NewWorker(ctx, d.WorkerPool)
		worker.Start()
	}

	d.ctx = ctx

	go d.dispatch(jobQueue)
}

func (d *Dispatcher) dispatch(jobQueue chan Job) {
	for {
		select {
		case job := <-jobQueue:
			go func(job Job) {
				jobChannel := <-d.WorkerPool

				jobChannel <- job
			}(job)
		case <-d.ctx.Done():
			return
		}
	}
}
