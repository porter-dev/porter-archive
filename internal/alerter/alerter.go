package alerter

import (
	"context"
)

type Alerter interface {
	SendAlert(ctx context.Context, err error, data map[string]interface{})
	Flush()
}

type NoOpAlerter struct{}

func (s *NoOpAlerter) SendAlert(ctx context.Context, err error, data map[string]interface{}) {}

func (s *NoOpAlerter) Flush() {}
