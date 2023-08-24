package worker

import (
	"context"
	"testing"

	"go.uber.org/goleak"
)

func TestDispatcher(t *testing.T) {
	defer goleak.VerifyNone(t)
	ctx := context.Background()
	jobChan := make(chan Job)

	d := NewDispatcher(10)
	err := d.Run(ctx, jobChan)
	if err != nil {
		panic(err)
	}

	d.Exit()
}
