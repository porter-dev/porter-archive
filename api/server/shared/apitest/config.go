package apitest

import (
	"os"
	"testing"

	"github.com/porter-dev/porter/internal/features"
	"github.com/porter-dev/porter/internal/telemetry"

	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/config/envloader"
	"github.com/porter-dev/porter/internal/analytics"
	"github.com/porter-dev/porter/internal/auth/sessionstore"
	"github.com/porter-dev/porter/internal/auth/token"
	"github.com/porter-dev/porter/internal/billing"
	"github.com/porter-dev/porter/internal/repository/test"
	"github.com/porter-dev/porter/pkg/logger"
)

type TestConfigLoader struct {
	canQuery           bool
	failingRepoMethods []string
}

func NewTestConfigLoader(canQuery bool, failingRepoMethods ...string) config.ConfigLoader {
	return &TestConfigLoader{canQuery, failingRepoMethods}
}

func (t *TestConfigLoader) LoadConfig() (*config.Config, error) {
	l := logger.New(true, os.Stdout)
	repo := test.NewRepository(t.canQuery, t.failingRepoMethods...)

	envConf, err := envloader.FromEnv()
	if err != nil {
		return nil, err
	}

	store, err := sessionstore.NewStore(
		&sessionstore.NewStoreOpts{
			SessionRepository: repo.Session(),
			CookieSecrets:     envConf.ServerConf.CookieSecrets,
		},
	)
	if err != nil {
		return nil, err
	}

	tokenConf := &token.TokenGeneratorConf{
		TokenSecret: envConf.ServerConf.TokenGeneratorSecret,
	}

	notifier := NewFakeUserNotifier()

	return &config.Config{
		Logger:             l,
		Repo:               repo,
		Store:              store,
		ServerConf:         envConf.ServerConf,
		TokenConf:          tokenConf,
		UserNotifier:       notifier,
		LaunchDarklyClient: &features.Client{},
		AnalyticsClient:    analytics.InitializeAnalyticsSegmentClient("", l),
		BillingManager:     billing.Manager{},
		TelemetryConfig:    telemetry.TracerConfig{ServiceName: "fake", CollectorURL: "fake"},
	}, nil
}

func LoadConfig(t *testing.T, failingRepoMethods ...string) *config.Config {
	configLoader := NewTestConfigLoader(true, failingRepoMethods...)

	config, err := configLoader.LoadConfig()
	if err != nil {
		t.Fatal(err)
	}

	return config
}
