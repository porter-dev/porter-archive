package api

import (
	"fmt"

	"github.com/go-playground/locales/en"
	ut "github.com/go-playground/universal-translator"
	vr "github.com/go-playground/validator/v10"
	sessionstore "github.com/porter-dev/porter/internal/auth"
	"github.com/porter-dev/porter/internal/oauth"
	"golang.org/x/oauth2"
	"gorm.io/gorm"

	"github.com/gorilla/sessions"
	"github.com/porter-dev/porter/internal/helm"
	"github.com/porter-dev/porter/internal/kubernetes"
	lr "github.com/porter-dev/porter/internal/logger"
	"github.com/porter-dev/porter/internal/repository"
	memory "github.com/porter-dev/porter/internal/repository/memory"
	"github.com/porter-dev/porter/internal/validator"
	"helm.sh/helm/v3/pkg/storage"

	"github.com/porter-dev/porter/internal/config"
)

// TestAgents are the k8s agents used for testing
type TestAgents struct {
	HelmAgent             *helm.Agent
	HelmTestStorageDriver *storage.Storage
	K8sAgent              *kubernetes.Agent
}

// AppConfig is the configuration required for creating a new App
type AppConfig struct {
	DB         *gorm.DB
	Logger     *lr.Logger
	Repository *repository.Repository
	ServerConf config.ServerConf
	RedisConf  *config.RedisConf
	DBConf     config.DBConf

	// TestAgents if API is in testing mode
	TestAgents *TestAgents
}

// App represents an API instance with handler methods attached, a DB connection
// and a logger instance
type App struct {
	// Server configuration
	ServerConf config.ServerConf

	// Logger for logging
	Logger *lr.Logger

	// Repo implements a query repository
	Repo *repository.Repository

	// session store for cookie-based sessions
	Store sessions.Store

	// agents exposed for testing
	TestAgents *TestAgents

	// redis client for redis connection
	RedisConf *config.RedisConf

	// config for db
	DBConf config.DBConf

	// oauth-specific clients
	GithubConf *oauth2.Config
	DOConf     *oauth2.Config

	db         *gorm.DB
	validator  *vr.Validate
	translator *ut.Translator
}

// New returns a new App instance
func New(conf *AppConfig) (*App, error) {
	// create a new validator and translator
	validator := validator.New()

	en := en.New()
	uni := ut.New(en, en)
	translator, found := uni.GetTranslator("en")

	if !found {
		return nil, fmt.Errorf("could not find \"en\" translator")
	}

	app := &App{
		Logger:     conf.Logger,
		Repo:       conf.Repository,
		ServerConf: conf.ServerConf,
		RedisConf:  conf.RedisConf,
		DBConf:     conf.DBConf,
		TestAgents: conf.TestAgents,
		db:         conf.DB,
		validator:  validator,
		translator: &translator,
	}

	// if repository not specified, default to in-memory
	if app.Repo == nil {
		app.Repo = memory.NewRepository(true)
	}

	// create the session store
	store, err := sessionstore.NewStore(app.Repo, app.ServerConf)

	if err != nil {
		return nil, err
	}

	app.Store = store

	// if server config contains OAuth client info, create clients
	if sc := conf.ServerConf; sc.GithubClientID != "" && sc.GithubClientSecret != "" {
		app.GithubConf = oauth.NewGithubClient(&oauth.Config{
			ClientID:     sc.GithubClientID,
			ClientSecret: sc.GithubClientSecret,
			Scopes:       []string{"repo", "user", "read:user"},
			BaseURL:      sc.ServerURL,
		})
	}

	if sc := conf.ServerConf; sc.DOClientID != "" && sc.DOClientSecret != "" {
		app.DOConf = oauth.NewDigitalOceanClient(&oauth.Config{
			ClientID:     sc.DOClientID,
			ClientSecret: sc.DOClientSecret,
			Scopes:       []string{"read", "write"},
			BaseURL:      sc.ServerURL,
		})
	}

	return app, nil
}
