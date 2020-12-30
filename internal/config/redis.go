package config

// RedisConf is the redis config required for the provisioner container
type RedisConf struct {
	Host string `env:"REDIS_HOST,default=redis"`
	Port string `env:"REDIS_PORT,default=5432"`
}
