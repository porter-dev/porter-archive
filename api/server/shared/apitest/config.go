package apitest

import (
	"os"
	"testing"

	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/internal/auth/sessionstore"
	"github.com/porter-dev/porter/internal/auth/token"
	"github.com/porter-dev/porter/internal/config"
	"github.com/porter-dev/porter/internal/logger"
	"github.com/porter-dev/porter/internal/repository/test"
)

type TestConfigLoader struct {
	canQuery           bool
	failingRepoMethods []string
}

func NewTestConfigLoader(canQuery bool, failingRepoMethods ...string) shared.ConfigLoader {
	return &TestConfigLoader{canQuery, failingRepoMethods}
}

func (t *TestConfigLoader) LoadConfig() (*shared.Config, error) {
	l := logger.New(true, os.Stdout)
	repo := test.NewRepository(t.canQuery, t.failingRepoMethods...)
	configFromEnv := config.FromEnv()
	store, err := sessionstore.NewStore(repo, configFromEnv.Server)

	if err != nil {
		return nil, err
	}

	tokenConf := &token.TokenGeneratorConf{
		TokenSecret: configFromEnv.Server.TokenGeneratorSecret,
	}

	notifier := NewFakeUserNotifier()

	return &shared.Config{
		Logger:       l,
		Repo:         repo,
		Store:        store,
		ServerConf:   configFromEnv.Server,
		TokenConf:    tokenConf,
		UserNotifier: notifier,
	}, nil
}

func LoadConfig(t *testing.T, failingRepoMethods ...string) *shared.Config {
	configLoader := NewTestConfigLoader(true, failingRepoMethods...)

	config, err := configLoader.LoadConfig()

	if err != nil {
		t.Fatal(err)
	}

	return config
}
