package adapter

import (
	"context"
	"fmt"

	redis "github.com/go-redis/redis/v8"
	"github.com/porter-dev/porter/api/server/shared/config/env"
)

// NewRedisClient returns a new redis client instance
func NewRedisClient(conf *env.RedisConf) (*redis.Client, error) {
	client := redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%s", conf.Host, conf.Port),
		Username: conf.Username,
		Password: conf.Password,
		DB:       conf.DB,
	})

	_, err := client.Ping(context.Background()).Result()
	return client, err
}
