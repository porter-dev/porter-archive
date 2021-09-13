package alerter

import (
	"context"

	"github.com/getsentry/sentry-go"
)

type SentryAlerter struct {
	client *sentry.Client
}

func noIntegrations(ints []sentry.Integration) []sentry.Integration {
	return []sentry.Integration{}
}

func NewSentryAlerter(sentryDSN string) (*SentryAlerter, error) {
	sentryClient, err := sentry.NewClient(sentry.ClientOptions{
		Dsn:              sentryDSN,
		AttachStacktrace: true,
		Integrations:     noIntegrations,
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

	scope.SetExtras(data)

	s.client.CaptureException(
		err,
		&sentry.EventHint{
			Data: data,
		},
		scope,
	)
}
