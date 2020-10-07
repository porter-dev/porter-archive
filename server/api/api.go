package api

import (
	"github.com/go-playground/locales/en"
	ut "github.com/go-playground/universal-translator"
	"github.com/go-playground/validator/v10"

	"github.com/gorilla/sessions"
	"github.com/porter-dev/porter/internal/config"
	lr "github.com/porter-dev/porter/internal/logger"
	"github.com/porter-dev/porter/internal/repository"
	"helm.sh/helm/v3/pkg/storage"
)

// App represents an API instance with handler methods attached, a DB connection
// and a logger instance
type App struct {
	logger     *lr.Logger
	repo       *repository.Repository
	validator  *validator.Validate
	store      sessions.Store
	translator *ut.Translator
	helmConf   *config.HelmGlobalConf
	// HelmTestStorageDriver is used by testing libraries to query the in-memory
	// Helm storage driver
	HelmTestStorageDriver *storage.Storage
	cookieName            string
}

// New returns a new App instance
func New(
	logger *lr.Logger,
	repo *repository.Repository,
	validator *validator.Validate,
	store sessions.Store,
	helmConf *config.HelmGlobalConf,
	cookieName string,
) *App {
	// for now, will just support the english translator from the
	// validator/translations package
	en := en.New()
	uni := ut.New(en, en)
	trans, _ := uni.GetTranslator("en")

	return &App{
		logger:     logger,
		repo:       repo,
		validator:  validator,
		store:      store,
		translator: &trans,
		helmConf:   helmConf,
		cookieName: cookieName,
	}
}

// Logger returns the logger instance in use by App
func (app *App) Logger() *lr.Logger {
	return app.logger
}
