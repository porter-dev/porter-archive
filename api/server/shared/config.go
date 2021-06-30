package shared

import (
	"github.com/gorilla/sessions"
	"github.com/porter-dev/porter/internal/auth/token"
	"github.com/porter-dev/porter/internal/config"
	"github.com/porter-dev/porter/internal/logger"
	"github.com/porter-dev/porter/internal/notifier"
	"github.com/porter-dev/porter/internal/repository"
)

type Config struct {
	// Logger for logging
	Logger *logger.Logger

	// Repo implements a query repository
	Repo repository.Repository

	// Capabilities is a description object for the server capabilities, used
	// to determine which endpoints to register
	Capabilities *Capabilities

	// Store implements a session store for session-based cookies
	Store sessions.Store

	// ServerConf is the set of configuration variables for the Porter server
	ServerConf config.ServerConf

	// TokenConf contains the config for generating and validating JWT tokens
	TokenConf *token.TokenGeneratorConf

	// UserNotifier is an object that notifies users of transactions (pw reset, email
	// verification, etc)
	UserNotifier notifier.UserNotifier
}

type ConfigLoader interface {
	LoadConfig() (*Config, error)
}
