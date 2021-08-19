package envloader

import (
	"fmt"

	"github.com/joeshaw/envdecode"
	"github.com/porter-dev/porter/api/server/shared"
)

type EnvDecoderConf struct {
	ServerConf shared.ServerConf
	RedisConf  shared.RedisConf
	DBConf     shared.DBConf
}

type EnvConf struct {
	ServerConf *shared.ServerConf
	RedisConf  *shared.RedisConf
	DBConf     *shared.DBConf
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
