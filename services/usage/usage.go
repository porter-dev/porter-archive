// +build ee

package usage

import (
	"sync"
	"time"

	"github.com/porter-dev/porter/api/server/shared/config/env"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/ee/integrations/vault"
	"github.com/porter-dev/porter/internal/adapter"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/oauth"
	"github.com/porter-dev/porter/internal/repository"
	"github.com/porter-dev/porter/internal/usage"
	"golang.org/x/oauth2"
	"gorm.io/gorm"

	"github.com/porter-dev/porter/internal/repository/credentials"
	rgorm "github.com/porter-dev/porter/internal/repository/gorm"
)

type UsageTracker struct {
	db               *gorm.DB
	repo             repository.Repository
	doConf           *oauth2.Config
	whitelistedUsers map[uint]uint
}

type UsageTrackerOpts struct {
	DBConf           *env.DBConf
	DOClientID       string
	DOClientSecret   string
	DOScopes         []string
	ServerURL        string
	WhitelistedUsers map[uint]uint
}

const stepSize = 100

func NewUsageTracker(opts *UsageTrackerOpts) (*UsageTracker, error) {
	db, err := adapter.New(opts.DBConf)

	if err != nil {
		return nil, err
	}

	var credBackend credentials.CredentialStorage

	if opts.DBConf.VaultAPIKey != "" && opts.DBConf.VaultServerURL != "" && opts.DBConf.VaultPrefix != "" {
		credBackend = vault.NewClient(
			opts.DBConf.VaultServerURL,
			opts.DBConf.VaultAPIKey,
			opts.DBConf.VaultPrefix,
		)
	}

	var key [32]byte

	for i, b := range []byte(opts.DBConf.EncryptionKey) {
		key[i] = b
	}

	repo := rgorm.NewRepository(db, &key, credBackend)

	doConf := oauth.NewDigitalOceanClient(&oauth.Config{
		ClientID:     opts.DOClientID,
		ClientSecret: opts.DOClientSecret,
		Scopes:       opts.DOScopes,
		BaseURL:      opts.ServerURL,
	})

	return &UsageTracker{db, repo, doConf, opts.WhitelistedUsers}, nil
}

type UsageTrackerResponse struct {
	CPULimit      uint
	CPUUsage      uint
	MemoryLimit   uint
	MemoryUsage   uint
	UserLimit     uint
	UserUsage     uint
	ClusterLimit  uint
	ClusterUsage  uint
	Exceeded      bool
	ExceededSince time.Time
	Project       models.Project
	AdminEmails   []string
}

func (u *UsageTracker) GetProjectUsage() (map[uint]*UsageTrackerResponse, error) {
	res := make(map[uint]*UsageTrackerResponse)

	// get the count of the projects
	var count int64

	if err := u.db.Model(&models.Project{}).Count(&count).Error; err != nil {
		return nil, err
	}

	var mu sync.Mutex
	var wg sync.WaitGroup

	worker := func(project *models.Project) error {
		defer wg.Done()

		current, limit, cache, err := usage.GetUsage(&usage.GetUsageOpts{
			Repo:             u.repo,
			DOConf:           u.doConf,
			Project:          project,
			WhitelistedUsers: u.whitelistedUsers,
		})

		if err != nil {
			return err
		}

		// get the admin emails for the project
		roles, err := u.repo.Project().ListProjectRoles(project.ID)

		if err != nil {
			return err
		}

		adminEmails := make([]string, 0)

		for _, role := range roles {
			if role.Kind == types.RoleAdmin {
				user, err := u.repo.User().ReadUser(role.UserID)

				if err != nil {
					continue
				}

				adminEmails = append(adminEmails, user.Email)
			}
		}

		exceededSince := cache.ExceededSince

		if exceededSince == nil {
			now := time.Now()
			exceededSince = &now
		}

		mu.Lock()
		res[project.ID] = &UsageTrackerResponse{
			CPUUsage:      cache.ResourceCPU,
			CPULimit:      limit.ResourceCPU,
			MemoryUsage:   cache.ResourceMemory,
			MemoryLimit:   limit.ResourceMemory,
			UserUsage:     current.Users,
			UserLimit:     limit.Users,
			ClusterUsage:  current.Clusters,
			ClusterLimit:  limit.Clusters,
			Exceeded:      cache.Exceeded,
			ExceededSince: *exceededSince,
			Project:       *project,
			AdminEmails:   adminEmails,
		}
		mu.Unlock()

		return nil
	}

	// iterate (count / stepSize) + 1 times using Limit and Offset
	for i := 0; i < (int(count)/stepSize)+1; i++ {
		projects := []*models.Project{}

		if err := u.db.Order("id asc").Offset(i * stepSize).Limit(stepSize).Find(&projects).Error; err != nil {
			return nil, err
		}

		// go through each project
		for _, project := range projects {
			wg.Add(1)
			go worker(project)
		}

		wg.Wait()
	}

	return res, nil
}
