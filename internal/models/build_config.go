package models

import (
	"strings"

	"github.com/porter-dev/porter/api/types"
	"gorm.io/gorm"
)

type BuildConfig struct {
	gorm.Model

	Name       string `json:"name"`
	Builder    string `json:"runtime"`
	Buildpacks string `json:"buildpacks"`
	Config     []byte `json:"config"`
}

func (conf *BuildConfig) ToBuildConfigType() *types.BuildConfig {
	return &types.BuildConfig{
		Builder:    conf.Builder,
		Buildpacks: strings.Split(conf.Buildpacks, ","),
		Config:     conf.Config,
	}
}
