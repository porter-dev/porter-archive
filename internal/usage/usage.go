package usage

import (
	"errors"
	"fmt"
	"time"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/kubernetes/nodes"
	"github.com/porter-dev/porter/internal/models"
	"gorm.io/gorm"
)

// GetUsage gets a project's current usage and usage limit
func GetUsage(config *config.Config, proj *models.Project) (
	current, limit *types.ProjectUsage,
	resourceUse *models.ProjectUsageCache,
	err error,
) {
	limit, err = GetLimit(config, proj)

	if err != nil {
		return nil, nil, nil, err
	}

	// query for the linked cluster counts
	clusters, err := config.Repo.Cluster().ListClustersByProjectID(proj.ID)

	if err != nil {
		return nil, nil, nil, err
	}

	// query for the linked user counts
	roles, err := config.Repo.Project().ListProjectRoles(proj.ID)

	if err != nil {
		return nil, nil, nil, err
	}

	usageCache, err := config.Repo.ProjectUsage().ReadProjectUsageCache(proj.ID)
	isCacheFound := true

	if isCacheFound = !errors.Is(err, gorm.ErrRecordNotFound); err != nil && isCacheFound {
		return nil, nil, nil, err
	}

	// if the usage cache is 24 hours old, was not found, or usage is over limit,
	// re-query for the usage
	if !isCacheFound || usageCache.Is24HrOld() || usageCache.ResourceMemory > limit.ResourceMemory || usageCache.ResourceCPU > limit.ResourceCPU {
		cpu, memory, err := getResourceUsage(config, clusters)

		if err != nil {
			return nil, nil, nil, err
		}

		if !isCacheFound {
			usageCache = &models.ProjectUsageCache{
				ProjectID:      proj.ID,
				ResourceCPU:    cpu,
				ResourceMemory: memory,
			}
		} else {
			usageCache.ResourceCPU = cpu
			usageCache.ResourceMemory = memory
		}

		isExceeded := usageCache.ResourceCPU > limit.ResourceCPU || usageCache.ResourceMemory > limit.ResourceMemory

		if !usageCache.Exceeded && isExceeded {
			// update the usage cache with a time exceeded
			currTime := time.Now()
			usageCache.ExceededSince = &currTime
		}

		usageCache.Exceeded = isExceeded

		if !isCacheFound {
			usageCache, err = config.Repo.ProjectUsage().CreateProjectUsageCache(usageCache)
		} else {
			usageCache, err = config.Repo.ProjectUsage().UpdateProjectUsageCache(usageCache)
		}
	}

	return &types.ProjectUsage{
		ResourceCPU:    usageCache.ResourceCPU,
		ResourceMemory: usageCache.ResourceMemory,
		Clusters:       uint(len(clusters)),
		Users:          uint(len(roles)),
	}, limit, usageCache, nil
}

// gets the total resource usage across all nodes in all clusters
func getResourceUsage(config *config.Config, clusters []*models.Cluster) (uint, uint, error) {
	// TODO; pass this in?
	var totCPU, totMem uint = 0, 0
	getter := authz.NewOutOfClusterAgentGetter(config)

	for _, cluster := range clusters {
		ooc := getter.GetOutOfClusterConfig(cluster)

		agent, err := kubernetes.GetAgentOutOfClusterConfig(ooc)

		if err != nil {
			return 0, 0, fmt.Errorf("failed to get agent: %s", err.Error())
		}

		totAlloc, err := nodes.GetAllocatableResources(agent.Clientset)

		if err != nil {
			return 0, 0, fmt.Errorf("failed to get alloc: %s", err.Error())
		}

		totCPU += totAlloc.CPU
		totMem += totAlloc.Memory
	}

	return totCPU / 1000, totMem / (1024 * 1024), nil
}
