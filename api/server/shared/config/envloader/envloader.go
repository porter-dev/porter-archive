package envloader

import (
	"fmt"

	"github.com/joeshaw/envdecode"
	"github.com/porter-dev/porter/api/server/shared/config/env"
)

type EnvDecoderConf struct {
	ServerConf env.ServerConf
	RedisConf  env.RedisConf
	DBConf     env.DBConf
}

type EnvConf struct {
	ServerConf *env.ServerConf
	RedisConf  *env.RedisConf
	DBConf     *env.DBConf
}

// FromEnv generates a configuration from environment variables
func FromEnv() (*EnvConf, error) {
	var envDecoderConf EnvDecoderConf = EnvDecoderConf{}

	if err := envdecode.StrictDecode(&envDecoderConf); err != nil {
		return nil, fmt.Errorf("Failed to decode server conf: %s", err)
	}

	return &EnvConf{
		ServerConf: &envDecoderConf.ServerConf,
		RedisConf:  &envDecoderConf.RedisConf,
		DBConf:     &envDecoderConf.DBConf,
	}, nil
}
