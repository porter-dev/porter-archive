package config

import (
	"log"
	"time"

	"github.com/joeshaw/envdecode"
)

// Conf is the configuration for the Go server
type Conf struct {
	Debug  bool `env:"DEBUG,default=false"`
	Server ServerConf
	Db     DBConf
	K8s    K8sConf
}

// ServerConf is the server configuration
type ServerConf struct {
	ServerURL      string        `env:"SERVER_URL,default=http://localhost:8080"`
	Port           int           `env:"SERVER_PORT,default=8080"`
	StaticFilePath string        `env:"STATIC_FILE_PATH,default=/porter/static"`
	CookieName     string        `env:"COOKIE_NAME,default=porter"`
	CookieSecret   []byte        `env:"COOKIE_SECRET,default=secret"`
	TimeoutRead    time.Duration `env:"SERVER_TIMEOUT_READ,default=5s"`
	TimeoutWrite   time.Duration `env:"SERVER_TIMEOUT_WRITE,default=10s"`
	TimeoutIdle    time.Duration `env:"SERVER_TIMEOUT_IDLE,default=15s"`

	GithubClientID     string `env:"GITHUB_CLIENT_ID"`
	GithubClientSecret string `env:"GITHUB_CLIENT_SECRET"`
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

	AdminInit     bool   `env:"ADMIN_INIT,default=true"`
	AdminEmail    string `env:"ADMIN_EMAIL,default=admin@example.com"`
	AdminPassword string `env:"ADMIN_PASSWORD,default=password"`

	SQLLite     bool   `env:"SQL_LITE,default=false"`
	SQLLitePath string `env:"SQL_LITE_PATH,default=/porter/porter.db"`
}

// K8sConf is the global configuration for the k8s agents
type K8sConf struct {
	IsTesting bool `env:"K8S_IS_TESTING,default=false"`
}

// FromEnv generates a configuration from environment variables
func FromEnv() *Conf {
	var c Conf

	if err := envdecode.StrictDecode(&c); err != nil {
		log.Fatalf("Failed to decode: %s", err)
	}

	return &c
}
