package api

import (
	lr "github.com/porter-dev/porter/internal/logger"
	"gorm.io/gorm"
)

// App represents an API instance with handler methods attached, a DB connection
// and a logger instance
type App struct {
	logger *lr.Logger
	db     *gorm.DB
}

// New returns a new App instance
func New(
	logger *lr.Logger,
	db *gorm.DB,
) *App {
	return &App{
		logger: logger,
		db:     db,
	}
}

// Logger returns the logger instance in use by App
func (app *App) Logger() *lr.Logger {
	return app.logger
}
