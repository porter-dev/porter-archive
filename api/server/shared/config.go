package shared

import (
	"github.com/porter-dev/porter/internal/logger"
	"github.com/porter-dev/porter/internal/repository"
)

type Config struct {
	// Logger for logging
	Logger *logger.Logger

	// Repo implements a query repository
	Repo *repository.Repository

	// Capabilities is a description object for the server capabilities, used
	// to determine which endpoints to register
	Capabilities *Capabilities
}
