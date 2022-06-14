package models

import (
	"github.com/porter-dev/porter/api/types"
	"gorm.io/gorm"
)

// Release model used to retrieve webhook tokens for a chart.

// Release type that extends gorm.Model
type Release struct {
	gorm.Model

	WebhookToken string `json:"webhook_token" gorm:"unique"`
	ClusterID    uint   `json:"cluster_id"`
	ProjectID    uint   `json:"project_id"`
	Name         string `json:"name"`
	Namespace    string `json:"namespace"`

	StackResourceID uint

	// The complete image repository uri to pull from. This is also stored in GitActionConfig,
	// but this should be used for the source of truth going forward.
	ImageRepoURI string `json:"image_repo_uri,omitempty"`

	GitActionConfig    *GitActionConfig `json:"git_action_config"`
	EventContainer     uint
	NotificationConfig uint
	BuildConfig        uint
	Tags               []*Tag `json:"tags" gorm:"many2many:release_tags"`
}

func (r *Release) ToReleaseType() *types.PorterRelease {
	res := &types.PorterRelease{
		ID:           r.ID,
		WebhookToken: r.WebhookToken,
		ImageRepoURI: r.ImageRepoURI,
		IsStack:      r.StackResourceID != 0,
	}

	if r.GitActionConfig != nil {
		res.GitActionConfig = r.GitActionConfig.ToGitActionConfigType()
	}

	tagsCount := len(r.Tags)

	if tagsCount > 0 {
		for i := 0; i < tagsCount; i++ {
			res.Tags = append(res.Tags, r.Tags[i].Name)
		}
	}

	return res
}
