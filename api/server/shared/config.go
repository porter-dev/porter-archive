package shared

import (
	"time"

	"github.com/gorilla/sessions"
	"github.com/porter-dev/porter/internal/auth/token"
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
	ServerConf *ServerConf

	// TokenConf contains the config for generating and validating JWT tokens
	TokenConf *token.TokenGeneratorConf

	// UserNotifier is an object that notifies users of transactions (pw reset, email
	// verification, etc)
	UserNotifier notifier.UserNotifier
}

type ConfigLoader interface {
	LoadConfig() (*Config, error)
}

// ServerConf is the server configuration
type ServerConf struct {
	Debug bool `env:"DEBUG,default=false"`

	ServerURL            string        `env:"SERVER_URL,default=http://localhost:8080"`
	Port                 int           `env:"SERVER_PORT,default=8080"`
	StaticFilePath       string        `env:"STATIC_FILE_PATH,default=/porter/static"`
	CookieName           string        `env:"COOKIE_NAME,default=porter"`
	CookieSecrets        []string      `env:"COOKIE_SECRETS,default=random_hash_key_;random_block_key"`
	TokenGeneratorSecret string        `env:"TOKEN_GENERATOR_SECRET,default=secret"`
	TimeoutRead          time.Duration `env:"SERVER_TIMEOUT_READ,default=5s"`
	TimeoutWrite         time.Duration `env:"SERVER_TIMEOUT_WRITE,default=10s"`
	TimeoutIdle          time.Duration `env:"SERVER_TIMEOUT_IDLE,default=15s"`
	IsLocal              bool          `env:"IS_LOCAL,default=false"`
	IsTesting            bool          `env:"IS_TESTING,default=false"`
	AppRootDomain        string        `env:"APP_ROOT_DOMAIN,default=porter.run"`

	DefaultApplicationHelmRepoURL string `env:"HELM_APP_REPO_URL,default=https://charts.dev.getporter.dev"`
	DefaultAddonHelmRepoURL       string `env:"HELM_ADD_ON_REPO_URL,default=https://chart-addons.dev.getporter.dev"`

	BasicLoginEnabled bool `env:"BASIC_LOGIN_ENABLED,default=true"`

	GithubClientID     string `env:"GITHUB_CLIENT_ID"`
	GithubClientSecret string `env:"GITHUB_CLIENT_SECRET"`
	GithubLoginEnabled bool   `env:"GITHUB_LOGIN_ENABLED,default=true"`

	GithubAppClientID      string `env:"GITHUB_APP_CLIENT_ID"`
	GithubAppClientSecret  string `env:"GITHUB_APP_CLIENT_SECRET"`
	GithubAppName          string `env:"GITHUB_APP_NAME"`
	GithubAppWebhookSecret string `env:"GITHUB_APP_WEBHOOK_SECRET"`
	GithubAppID            string `env:"GITHUB_APP_ID"`
	GithubAppSecretPath    string `env:"GITHUB_APP_SECRET_PATH"`

	GoogleClientID         string `env:"GOOGLE_CLIENT_ID"`
	GoogleClientSecret     string `env:"GOOGLE_CLIENT_SECRET"`
	GoogleRestrictedDomain string `env:"GOOGLE_RESTRICTED_DOMAIN"`

	SendgridAPIKey                  string `env:"SENDGRID_API_KEY"`
	SendgridPWResetTemplateID       string `env:"SENDGRID_PW_RESET_TEMPLATE_ID"`
	SendgridPWGHTemplateID          string `env:"SENDGRID_PW_GH_TEMPLATE_ID"`
	SendgridVerifyEmailTemplateID   string `env:"SENDGRID_VERIFY_EMAIL_TEMPLATE_ID"`
	SendgridProjectInviteTemplateID string `env:"SENDGRID_INVITE_TEMPLATE_ID"`
	SendgridSenderEmail             string `env:"SENDGRID_SENDER_EMAIL"`

	SlackClientID     string `env:"SLACK_CLIENT_ID"`
	SlackClientSecret string `env:"SLACK_CLIENT_SECRET"`

	DOClientID                 string `env:"DO_CLIENT_ID"`
	DOClientSecret             string `env:"DO_CLIENT_SECRET"`
	ProvisionerImageTag        string `env:"PROV_IMAGE_TAG,default=latest"`
	ProvisionerImagePullSecret string `env:"PROV_IMAGE_PULL_SECRET"`
	SegmentClientKey           string `env:"SEGMENT_CLIENT_KEY"`

	ProvisionerCluster string `env:"PROVISIONER_CLUSTER"`
	IngressCluster     string `env:"INGRESS_CLUSTER"`
	SelfKubeconfig     string `env:"SELF_KUBECONFIG"`
}

// DBConf is the database configuration: if generated from environment variables,
// it assumes the default docker-compose configuration is used
type DBConf struct {
	// EncryptionKey is the key to use for sensitive values that are encrypted at rest
	EncryptionKey string `env:"ENCRYPTION_KEY,default=__random_strong_encryption_key__"`

	Host     string `env:"DB_HOST,default=postgres"`
	Port     int    `env:"DB_PORT,default=5432"`
	Username string `env:"DB_USER,default=porter"`
	Password string `env:"DB_PASS,default=porter"`
	DbName   string `env:"DB_NAME,default=porter"`
	ForceSSL bool   `env:"DB_FORCE_SSL,default=false"`

	SQLLite     bool   `env:"SQL_LITE,default=false"`
	SQLLitePath string `env:"SQL_LITE_PATH,default=/porter/porter.db"`
}

// RedisConf is the redis config required for the provisioner container
type RedisConf struct {
	// if redis should be used
	Enabled bool `env:"REDIS_ENABLED,default=true"`

	Host     string `env:"REDIS_HOST,default=redis"`
	Port     string `env:"REDIS_PORT,default=6379"`
	Username string `env:"REDIS_USER"`
	Password string `env:"REDIS_PASS"`
	DB       int    `env:"REDIS_DB,default=0"`
}
