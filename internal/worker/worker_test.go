package worker

import (
	"testing"

	"github.com/google/uuid"
	"go.uber.org/goleak"
)

func TestWorker(t *testing.T) {
	defer goleak.VerifyNone(t)

	uuid, err := uuid.NewUUID()

	if err != nil {
		panic(err)
	}

	workerPool := make(chan chan Job, 10)

	w := NewWorker(uuid, workerPool)

	w.Start()
	w.Stop()
}
