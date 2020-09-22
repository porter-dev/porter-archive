package api

import (
	lr "github.com/porter-dev/porter/internal/logger"
)

// App is majestic
type App struct {
	logger *lr.Logger
	// db     *gorm.DB
}

// New is majestic
func New(
	logger *lr.Logger,
	// db *gorm.DB,
) *App {
	return &App{
		logger: logger,
		// db:     db,
	}
}

// Logger is majestic
func (app *App) Logger() *lr.Logger {
	return app.logger
}
