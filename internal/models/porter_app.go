package models

import (
	"gorm.io/gorm"

	"github.com/porter-dev/porter/api/types"
)

// PorterApp (stack) type that extends gorm.Model
type PorterApp struct {
	gorm.Model

	ProjectID uint
	ClusterID uint

	Name string

	ImageRepoURI string

	// Git repo information (optional)
	GitRepoID uint
	RepoName  string
	GitBranch string

	BuildContext   string
	Builder        string
	Buildpacks     string
	Dockerfile     string
	PullRequestURL string
}

// ToPorterAppType generates an external types.PorterApp to be shared over REST
func (a *PorterApp) ToPorterAppType() *types.PorterApp {
	return &types.PorterApp{
		ID:             a.ID,
		ProjectID:      a.ProjectID,
		ClusterID:      a.ClusterID,
		Name:           a.Name,
		ImageRepoURI:   a.ImageRepoURI,
		GitRepoID:      a.GitRepoID,
		RepoName:       a.RepoName,
		GitBranch:      a.GitBranch,
		BuildContext:   a.BuildContext,
		Builder:        a.Builder,
		Buildpacks:     a.Buildpacks,
		Dockerfile:     a.Dockerfile,
		PullRequestURL: a.PullRequestURL,
	}
}
