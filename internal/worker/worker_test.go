package worker

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"go.uber.org/goleak"
)

func TestWorker(t *testing.T) {
	defer goleak.VerifyNone(t)
	ctx := context.Background()

	uuid, err := uuid.NewUUID()
	if err != nil {
		panic(err)
	}

	workerPool := make(chan chan Job, 10)

	w := NewWorker(uuid, workerPool)

	w.Start(ctx)
	w.Stop()
}
