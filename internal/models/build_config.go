package models

import (
	"github.com/porter-dev/porter/api/types"
	"gorm.io/gorm"
)

type BuildConfig struct {
	gorm.Model

	Name       string `json:"name"`
	Runtime    string `json:"runtime"`
	Buildpacks []byte `json:"buildpacks"` // FIXME: should be a []string
	Config     []byte `json:"config"`
}

func (conf *BuildConfig) ToBuildConfigType() *types.BuildConfig {
	return &types.BuildConfig{
		Name:       conf.Name,
		Runtime:    conf.Runtime,
		Buildpacks: conf.Buildpacks,
		Config:     conf.Config,
	}
}
