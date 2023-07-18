package models

import (
	"github.com/porter-dev/porter/api/types"
	"gorm.io/gorm"
)

type PreviewEnvironment struct {
	gorm.Model

	GitRepoOwner string
	GitRepoName  string
	Branch       string

	NewCommentsDisabled bool

	EnvironmentConfigID uint
	EnvironmentConfig   EnvironmentConfig
}

func (p *PreviewEnvironment) ToPreviewEnvironmentType() *types.PreviewEnvironment {
	return &types.PreviewEnvironment{
		ID:                  p.Model.ID,
		GitRepoOwner:        p.GitRepoOwner,
		GitRepoName:         p.GitRepoName,
		Branch:              p.Branch,
		NewCommentsDisabled: p.NewCommentsDisabled,
		EnvironmentConfigID: p.EnvironmentConfigID,
	}
}
