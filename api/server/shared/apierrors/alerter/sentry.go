package alerter

import (
	"context"

	"github.com/getsentry/sentry-go"
)

type SentryAlerter struct {
	client *sentry.Client
}

func NewSentryAlerter(sentryDSN string) (*SentryAlerter, error) {
	sentryClient, err := sentry.NewClient(sentry.ClientOptions{
		Dsn: sentryDSN,
	})

	if err != nil {
		return nil, err
	}

	return &SentryAlerter{
		client: sentryClient,
	}, nil
}

func (s *SentryAlerter) SendAlert(ctx context.Context, err error) {
	s.client.CaptureException(err, &sentry.EventHint{}, nil)
}
