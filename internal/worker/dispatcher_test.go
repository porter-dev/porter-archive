package worker

import (
	"testing"

	"go.uber.org/goleak"
)

func TestDispatcher(t *testing.T) {
	defer goleak.VerifyNone(t)

	jobChan := make(chan Job)

	d := NewDispatcher(10)
	err := d.Run(jobChan)

	if err != nil {
		panic(err)
	}

	d.Exit()
}
