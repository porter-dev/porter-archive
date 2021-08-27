package alerter

import (
	"context"
)

type Alerter interface {
	SendAlert(ctx context.Context, err error)
}
