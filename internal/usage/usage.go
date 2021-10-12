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

	usageCache, err := opts.Repo.ProjectUsage().ReadProjectUsageCache(opts.Project.ID)
	isCacheFound := true

	if isCacheFound = !errors.Is(err, gorm.ErrRecordNotFound); err != nil && isCacheFound {
		return nil, nil, nil, err
	}

	// if the usage cache is 1 hour old, was not found, or usage is over limit,
	// re-query for the usage
	if !isCacheFound || usageCache.Is1HrOld() || usageCache.ResourceMemory > limit.ResourceMemory || usageCache.ResourceCPU > limit.ResourceCPU {
		cpu, memory, err := getResourceUsage(opts, clusters)

		if err != nil {
			return nil, nil, nil, err
		}

		if !isCacheFound {
			usageCache = &models.ProjectUsageCache{
				ProjectID:      opts.Project.ID,
				ResourceCPU:    cpu,
				ResourceMemory: memory,
			}
		} else {
			usageCache.ResourceCPU = cpu
			usageCache.ResourceMemory = memory
		}

		isExceeded := isUsageExceeded(usageCache, limit, uint(len(countedRoles)), uint(len(clusters)))

		if !usageCache.Exceeded && isExceeded {
			// update the usage cache with a time exceeded
			currTime := time.Now()
			usageCache.ExceededSince = &currTime
		}

		usageCache.Exceeded = isExceeded

		if !isCacheFound {
			usageCache, err = opts.Repo.ProjectUsage().CreateProjectUsageCache(usageCache)
		} else {
			usageCache, err = opts.Repo.ProjectUsage().UpdateProjectUsageCache(usageCache)
		}
	}

	// we check whether it's currently exceeded based on the cache every time, since
	// it's an inexpensive operation and involves no further DB lookups
	usageCache.Exceeded = isUsageExceeded(usageCache, limit, uint(len(countedRoles)), uint(len(clusters)))

	return &types.ProjectUsage{
		ResourceCPU:    usageCache.ResourceCPU,
		ResourceMemory: usageCache.ResourceMemory,
		Clusters:       uint(len(clusters)),
		Users:          uint(len(countedRoles)),
	}, limit, usageCache, nil
}

func isUsageExceeded(usageCache *models.ProjectUsageCache, limit *types.ProjectUsage, numUsers, numClusters uint) bool {
	isCPUExceeded := limit.ResourceCPU != 0 && usageCache.ResourceCPU > limit.ResourceCPU
	isMemExceeded := limit.ResourceMemory != 0 && usageCache.ResourceMemory > limit.ResourceMemory
	isUsersExceeded := limit.Users != 0 && numUsers > limit.Users
	isClustersExceeded := limit.Clusters != 0 && numClusters > limit.Clusters

	return isCPUExceeded || isMemExceeded || isUsersExceeded || isClustersExceeded
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
			// return 0, 0, fmt.Errorf("failed to get agent: %s", err.Error())
		}

		totAlloc, err := nodes.GetAllocatableResources(agent.Clientset)

		if err != nil {
			continue
			// return 0, 0, fmt.Errorf("failed to get alloc: %s", err.Error())
		}

		totCPU += totAlloc.CPU
		totMem += totAlloc.Memory
	}

	return totCPU / 1000, totMem / (1000 * 1000), nil
}
