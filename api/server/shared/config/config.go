package config

import (
	"github.com/gorilla/sessions"
	"github.com/porter-dev/porter/api/server/shared/apierrors/alerter"
	"github.com/porter-dev/porter/api/server/shared/config/env"
	"github.com/porter-dev/porter/api/server/shared/websocket"
	"github.com/porter-dev/porter/internal/analytics"
	"github.com/porter-dev/porter/internal/auth/token"
	"github.com/porter-dev/porter/internal/helm/urlcache"
	"github.com/porter-dev/porter/internal/integrations/bind"
	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/logger"
	"github.com/porter-dev/porter/internal/notifier"
	"github.com/porter-dev/porter/internal/oauth"
	"github.com/porter-dev/porter/internal/repository"
	"golang.org/x/oauth2"
	"gorm.io/gorm"
)

type Config struct {
	// Logger for logging
	Logger *logger.Logger

	// Repo implements a query repository
	Repo repository.Repository

	// Metadata is a description object for the server metadata, used
	// to determine which endpoints to register
	Metadata *Metadata

	// Alerter sends messages to alert aggregators (like Sentry) if the
	// error is fatal
	Alerter alerter.Alerter

	// Store implements a session store for session-based cookies
	Store sessions.Store

	// ServerConf is the set of configuration variables for the Porter server
	ServerConf *env.ServerConf

	// DBConf is the set of configuration variables for the DB
	DBConf *env.DBConf

	// RedisConf is the set of configuration variables for the redis instance
	RedisConf *env.RedisConf

	// TokenConf contains the config for generating and validating JWT tokens
	TokenConf *token.TokenGeneratorConf

	// UserNotifier is an object that notifies users of transactions (pw reset, email
	// verification, etc)
	UserNotifier notifier.UserNotifier

	// DOConf is the configuration for a DigitalOcean OAuth client
	DOConf *oauth2.Config

	// GithubConf is the configuration for a Github OAuth client
	GithubConf *oauth2.Config

	// GithubAppConf is the configuration for a Github App OAuth client
	GithubAppConf *oauth.GithubAppConf

	// GoogleConf is the configuration for a Google OAuth client
	GoogleConf *oauth2.Config

	// SlackConf is the configuration for a Slack OAuth client
	SlackConf *oauth2.Config

	// WSUpgrader upgrades HTTP connections to websocket connections
	WSUpgrader *websocket.Upgrader

	// URLCache contains a cache of chart names to chart repos
	URLCache *urlcache.ChartURLCache

	// ProvisionerAgent is the kubernetes client responsible for creating new provisioner
	// jobs
	ProvisionerAgent *kubernetes.Agent

	// DB is the gorm DB instance
	DB *gorm.DB

	// AnalyticsClient if Segment analytics reporting is enabled on the API instance
	AnalyticsClient analytics.AnalyticsSegmentClient

	// BindClient is a client for Bind DNS, if the Porter instance supports vanity URLs
	BindClient *bind.Client
}

type ConfigLoader interface {
	LoadConfig() (*Config, error)
}
