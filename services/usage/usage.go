package usage

import (
	"time"

	"github.com/porter-dev/porter/api/server/shared/config/env"
	"github.com/porter-dev/porter/internal/adapter"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/oauth"
	"github.com/porter-dev/porter/internal/repository"
	"github.com/porter-dev/porter/internal/usage"
	"golang.org/x/oauth2"
	"gorm.io/gorm"

	rgorm "github.com/porter-dev/porter/internal/repository/gorm"
)

type UsageTracker struct {
	db     *gorm.DB
	repo   repository.Repository
	doConf *oauth2.Config
}

type UsageTrackerOpts struct {
	DBConf         *env.DBConf
	DOClientID     string
	DOClientSecret string
	DOScopes       []string
	ServerURL      string
}

const stepSize = 100

func NewUsageTracker(opts *UsageTrackerOpts) (*UsageTracker, error) {
	db, err := adapter.New(opts.DBConf)

	if err != nil {
		return nil, err
	}

	var key [32]byte

	for i, b := range []byte(opts.DBConf.EncryptionKey) {
		key[i] = b
	}

	repo := rgorm.NewRepository(db, &key)

	doConf := oauth.NewDigitalOceanClient(&oauth.Config{
		ClientID:     opts.DOClientID,
		ClientSecret: opts.DOClientSecret,
		Scopes:       opts.DOScopes,
		BaseURL:      opts.ServerURL,
	})

	return &UsageTracker{db, repo, doConf}, nil
}

type UsageTrackerResponse struct {
	ResourceCPU    uint
	ResourceMemory uint
	Exceeded       bool
	ExceededSince  *time.Time
	Project        *models.Project
}

func (u *UsageTracker) GetProjectUsage() (map[uint]*UsageTrackerResponse, error) {
	res := make(map[uint]*UsageTrackerResponse)

	// get the count of the projects
	var count int64

	if err := u.db.Model(&models.Project{}).Count(&count).Error; err != nil {
		return nil, err
	}

	// iterate (count / stepSize) + 1 times using Limit and Offset
	for i := 0; i < (int(count)/stepSize)+1; i++ {
		projects := []*models.Project{}

		if err := u.db.Order("id asc").Offset(i * stepSize).Limit(stepSize).Find(&projects).Error; err != nil {
			return nil, err
		}

		// go through each project
		for _, project := range projects {
			_, _, cache, err := usage.GetUsage(&usage.GetUsageOpts{
				Repo:    u.repo,
				DOConf:  u.doConf,
				Project: project,
			})

			if err != nil {
				continue
			}

			res[project.ID] = &UsageTrackerResponse{
				ResourceCPU:    cache.ResourceCPU,
				ResourceMemory: cache.ResourceMemory,
				Exceeded:       cache.Exceeded,
				ExceededSince:  cache.ExceededSince,
				Project:        project,
			}
		}
	}

	return res, nil
}
