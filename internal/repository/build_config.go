package repository

import "github.com/porter-dev/porter/internal/models"

// BuildConfigRepository represents the set of queries on the BuildConfig model
type BuildConfigRepository interface {
	CreateBuildConfig(*models.BuildConfig) (*models.BuildConfig, error)
	UpdateBuildConfig(*models.BuildConfig) (*models.BuildConfig, error)
}
