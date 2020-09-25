package api

import (
	"github.com/go-playground/locales/en"
	ut "github.com/go-playground/universal-translator"
	"github.com/go-playground/validator/v10"
	lr "github.com/porter-dev/porter/internal/logger"
	"github.com/porter-dev/porter/internal/repository"
)

// App represents an API instance with handler methods attached, a DB connection
// and a logger instance
type App struct {
	logger     *lr.Logger
	repo       *repository.Repository
	validator  *validator.Validate
	translator *ut.Translator
}

// New returns a new App instance
func New(
	logger *lr.Logger,
	repo *repository.Repository,
	validator *validator.Validate,
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
		translator: &trans,
	}
}

// Logger returns the logger instance in use by App
func (app *App) Logger() *lr.Logger {
	return app.logger
}
