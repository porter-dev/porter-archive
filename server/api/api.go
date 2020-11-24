package api

import (
	"github.com/go-playground/locales/en"
	ut "github.com/go-playground/universal-translator"
	"github.com/go-playground/validator/v10"
	"github.com/porter-dev/porter/internal/oauth"
	"golang.org/x/oauth2"
	"gorm.io/gorm"

	"github.com/gorilla/sessions"
	"github.com/porter-dev/porter/internal/helm"
	"github.com/porter-dev/porter/internal/kubernetes"
	lr "github.com/porter-dev/porter/internal/logger"
	"github.com/porter-dev/porter/internal/repository"
	"helm.sh/helm/v3/pkg/storage"
)

// TestAgents are the k8s agents used for testing
type TestAgents struct {
	HelmAgent             *helm.Agent
	HelmTestStorageDriver *storage.Storage
	K8sAgent              *kubernetes.Agent
}

// App represents an API instance with handler methods attached, a DB connection
// and a logger instance
type App struct {
	db           *gorm.DB
	logger       *lr.Logger
	repo         *repository.Repository
	validator    *validator.Validate
	store        sessions.Store
	translator   *ut.Translator
	cookieName   string
	testing      bool
	isLocal      bool
	TestAgents   *TestAgents
	GithubConfig *oauth2.Config
}

// New returns a new App instance
// TODO -- this should accept an app/server config
func New(
	logger *lr.Logger,
	db *gorm.DB,
	repo *repository.Repository,
	validator *validator.Validate,
	store sessions.Store,
	cookieName string,
	testing bool,
	isLocal bool,
	githubConfig *oauth.Config,
) *App {
	// for now, will just support the english translator from the
	// validator/translations package
	en := en.New()
	uni := ut.New(en, en)
	trans, _ := uni.GetTranslator("en")

	var testAgents *TestAgents = nil

	if testing {
		memStorage := helm.StorageMap["memory"](nil, nil, "")

		testAgents = &TestAgents{
			HelmAgent:             helm.GetAgentTesting(&helm.Form{}, nil, logger),
			HelmTestStorageDriver: memStorage,
			K8sAgent:              kubernetes.GetAgentTesting(),
		}
	}

	var oauthGithubConf *oauth2.Config

	if githubConfig != nil {
		oauthGithubConf = oauth.NewGithubClient(githubConfig)
	}

	return &App{
		db:           db,
		logger:       logger,
		repo:         repo,
		validator:    validator,
		store:        store,
		translator:   &trans,
		cookieName:   cookieName,
		testing:      testing,
		isLocal:      isLocal,
		TestAgents:   testAgents,
		GithubConfig: oauthGithubConf,
	}
}

// Logger returns the logger instance in use by App
func (app *App) Logger() *lr.Logger {
	return app.logger
}
