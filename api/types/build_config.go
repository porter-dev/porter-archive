package types

import "github.com/porter-dev/porter/internal/integrations/buildpacks"

// BuildConfig
type BuildConfig struct {
	Name       string `json:"name"`
	Runtime    string `json:"runtime"`
	Buildpacks []byte `json:"buildpacks"` // FIXME: should be a []string
	Config     []byte `json:"data"`
}

type CreateBuildConfigRequest struct {
	Name       string                      `json:"name" form:"required"`
	Runtime    string                      `json:"runtime" form:"required"`
	Buildpacks []*buildpacks.BuildpackInfo `json:"buildpacks"`
	Config     map[string]interface{}      `json:"config,omitempty"`
}

type UpdateBuildConfigRequest struct {
	Buildpacks []*buildpacks.BuildpackInfo `json:"buildpacks"`
	Config     map[string]interface{}      `json:"config,omitempty"`
}
