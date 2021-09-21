package apitest

import (
	"os"
	"testing"

	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/config/loader"
	"github.com/porter-dev/porter/internal/analytics"
	"github.com/porter-dev/porter/internal/auth/sessionstore"
	"github.com/porter-dev/porter/internal/auth/token"
	"github.com/porter-dev/porter/internal/logger"
	"github.com/porter-dev/porter/internal/repository/test"
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

	envConf, err := loader.FromEnv()

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
		Logger:          l,
		Repo:            repo,
		Store:           store,
		ServerConf:      envConf.ServerConf,
		TokenConf:       tokenConf,
		UserNotifier:    notifier,
		AnalyticsClient: analytics.InitializeAnalyticsSegmentClient("", l),
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
