package usage

import (
	"errors"
	"time"

	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/kubernetes/nodes"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"golang.org/x/oauth2"
	"gorm.io/gorm"
)

type GetUsageOpts struct {
	Repo             repository.Repository
	DOConf           *oauth2.Config
	Project          *models.Project
	WhitelistedUsers map[uint]uint
}

// GetUsage gets a project's current usage and usage limit
func GetUsage(opts *GetUsageOpts) (
	current, limit *types.ProjectUsage,
	resourceUse *models.ProjectUsageCache,
	err error,
) {
	limit, err = GetLimit(opts.Repo, opts.Project)

	if err != nil {
		return nil, nil, nil, err
	}

	usageCache, err := opts.Repo.ProjectUsage().ReadProjectUsageCache(opts.Project.ID)
	isCacheFound := true

	if isCacheFound = !errors.Is(err, gorm.ErrRecordNotFound); err != nil && isCacheFound {
		return nil, nil, nil, err
	}

	// query for the linked cluster counts
	clusters, err := opts.Repo.Cluster().ListClustersByProjectID(opts.Project.ID)

	if err != nil {
		return nil, nil, nil, err
	}

	// query for the linked user counts
	roles, err := opts.Repo.Project().ListProjectRoles(opts.Project.ID)

	if err != nil {
		return nil, nil, nil, err
	}

	countedRoles := make([]models.Role, 0)

	for _, role := range roles {
		if _, exists := opts.WhitelistedUsers[role.UserID]; !exists {
			countedRoles = append(countedRoles, role)
		}
	}

	if !isCacheFound {
		usageCache = &models.ProjectUsageCache{
			ProjectID: opts.Project.ID,
		}
	}

	oldUsageCache := usageCache

	usageCache.Clusters = uint(len(clusters))
	usageCache.Users = uint(len(countedRoles))

	// if the usage cache is 1 hour old, was not found, usage is currently over limit, or the clusters/users
	// counts have changed, re-query for the usage
	if !isCacheFound || usageCache.Is1HrOld() || isUsageExceeded(usageCache, limit) || isUsageChanged(oldUsageCache, usageCache) {
		cpu, memory, err := getResourceUsage(opts, clusters)

		if err != nil {
			return nil, nil, nil, err
		}

		usageCache.ResourceCPU = cpu
		usageCache.ResourceMemory = memory
	}

	isExceeded := isUsageExceeded(usageCache, limit)

	if !usageCache.Exceeded && isExceeded {
		// update the usage cache with a time exceeded
		currTime := time.Now()
		usageCache.ExceededSince = &currTime
	}

	usageCache.Exceeded = isExceeded

	if !isCacheFound {
		usageCache, err = opts.Repo.ProjectUsage().CreateProjectUsageCache(usageCache)
	} else if isUsageChanged(oldUsageCache, usageCache) {
		usageCache, err = opts.Repo.ProjectUsage().UpdateProjectUsageCache(usageCache)
	}

	return &types.ProjectUsage{
		ResourceCPU:    usageCache.ResourceCPU,
		ResourceMemory: usageCache.ResourceMemory,
		Clusters:       usageCache.Clusters,
		Users:          usageCache.Users,
	}, limit, usageCache, nil
}

func isUsageExceeded(usageCache *models.ProjectUsageCache, limit *types.ProjectUsage) bool {
	isCPUExceeded := limit.ResourceCPU != 0 && usageCache.ResourceCPU > limit.ResourceCPU
	isMemExceeded := limit.ResourceMemory != 0 && usageCache.ResourceMemory > limit.ResourceMemory
	isUsersExceeded := limit.Users != 0 && usageCache.Users > limit.Users
	isClustersExceeded := limit.Clusters != 0 && usageCache.Clusters > limit.Clusters

	return isCPUExceeded || isMemExceeded || isUsersExceeded || isClustersExceeded
}

func isUsageChanged(oldUsageCache, currUsageCache *models.ProjectUsageCache) bool {
	return oldUsageCache.Exceeded != currUsageCache.Exceeded ||
		oldUsageCache.Clusters != currUsageCache.Clusters ||
		oldUsageCache.Users != currUsageCache.Users ||
		oldUsageCache.ResourceCPU != currUsageCache.ResourceCPU ||
		oldUsageCache.ResourceMemory != currUsageCache.ResourceMemory
}

// gets the total resource usage across all nodes in all clusters
func getResourceUsage(opts *GetUsageOpts, clusters []*models.Cluster) (uint, uint, error) {
	var totCPU, totMem uint = 0, 0

	for _, cluster := range clusters {
		ooc := &kubernetes.OutOfClusterConfig{
			Cluster:           cluster,
			Repo:              opts.Repo,
			DigitalOceanOAuth: opts.DOConf,
		}

		agent, err := kubernetes.GetAgentOutOfClusterConfig(ooc)

		if err != nil {
			continue
		}

		totAlloc, err := nodes.GetAllocatableResources(agent.Clientset)

		if err != nil {
			continue
		}

		totCPU += totAlloc.CPU
		totMem += totAlloc.Memory
	}

	return totCPU / 1000, totMem / (1000 * 1000), nil
}
