package alerter

import (
	"context"
	"fmt"

	"github.com/getsentry/sentry-go"
)

type SentryAlerter struct {
	client *sentry.Client
}

func noIntegrations(ints []sentry.Integration) []sentry.Integration {
	return []sentry.Integration{}
}

func NewSentryAlerter(sentryDSN, sentryEnv string) (*SentryAlerter, error) {
	sentryClient, err := sentry.NewClient(sentry.ClientOptions{
		Dsn:              sentryDSN,
		AttachStacktrace: true,
		Integrations:     noIntegrations,
		Environment:      sentryEnv,
	})

	if err != nil {
		return nil, err
	}

	return &SentryAlerter{
		client: sentryClient,
	}, nil
}

func (s *SentryAlerter) SendAlert(ctx context.Context, err error, data map[string]interface{}) {
	scope := sentry.NewScope()

	for key, val := range data {
		scope.SetTag(key, fmt.Sprintf("%v", val))
	}

	s.client.CaptureException(
		err,
		&sentry.EventHint{
			Data: data,
		},
		scope,
	)
}
