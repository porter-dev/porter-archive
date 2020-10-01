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
}

// ServerConf is the server configuration
type ServerConf struct {
	Port          int           `env:"SERVER_PORT,default=8080"`
	CookieName    string        `env:"COOKIE_NAME,default=porter"`
	CookieSecrets [][]byte      `env:"COOKIE_SECRETS,default=secret"`
	TimeoutRead   time.Duration `env:"SERVER_TIMEOUT_READ,default=5s"`
	TimeoutWrite  time.Duration `env:"SERVER_TIMEOUT_WRITE,default=10s"`
	TimeoutIdle   time.Duration `env:"SERVER_TIMEOUT_IDLE,default=15s"`
}

// DBConf is the database configuration: if generated from environment variables,
// it assumes the default docker-compose configuration is used
type DBConf struct {
	Host     string `env:"DB_HOST,default=postgres"`
	Port     int    `env:"DB_PORT,default=5432"`
	Username string `env:"DB_USER,default=porter"`
	Password string `env:"DB_PASS,default=porter"`
	DbName   string `env:"DB_NAME,default=porter"`
}

// FromEnv generates a configuration from environment variables
func FromEnv() *Conf {
	var c Conf

	if err := envdecode.StrictDecode(&c); err != nil {
		log.Fatalf("Failed to decode: %s", err)
	}

	return &c
}
