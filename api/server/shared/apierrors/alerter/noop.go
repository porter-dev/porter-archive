package alerter

import (
	"context"
)

type NoOpAlerter struct{}

func (s NoOpAlerter) SendAlert(ctx context.Context, err error, data map[string]interface{}) {}
