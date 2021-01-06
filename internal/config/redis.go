package config

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
