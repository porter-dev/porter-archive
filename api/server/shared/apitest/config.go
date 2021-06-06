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
	canQuery bool
}

func NewTestConfigLoader(canQuery bool) shared.ConfigLoader {
	return &TestConfigLoader{canQuery}
}

func (t *TestConfigLoader) LoadConfig() (*shared.Config, error) {
	l := logger.New(true, os.Stdout)
	repo := test.NewRepository(t.canQuery)
	configFromEnv := config.FromEnv()
	store, err := sessionstore.NewStore(repo, configFromEnv.Server)

	if err != nil {
		return nil, err
	}

	tokenConf := &token.TokenGeneratorConf{
		TokenSecret: configFromEnv.Server.TokenGeneratorSecret,
	}

	return &shared.Config{
		Logger:     l,
		Repo:       repo,
		Store:      store,
		CookieName: configFromEnv.Server.CookieName,
		TokenConf:  tokenConf,
	}, nil
}

func LoadConfig(t *testing.T) *shared.Config {
	configLoader := NewTestConfigLoader(true)

	config, err := configLoader.LoadConfig()

	if err != nil {
		t.Fatal(err)
	}

	return config
}
