package project

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/kubernetes/nodes"
	"github.com/porter-dev/porter/internal/models"
	"gorm.io/gorm"
)

type ProjectGetUsageHandler struct {
	handlers.PorterHandlerWriter
}

func NewProjectGetUsageHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *ProjectGetUsageHandler {
	return &ProjectGetUsageHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (p *ProjectGetUsageHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	res := &types.GetProjectUsageResponse{}

	currUsage, limit, err := GetUsage(p.Config(), r)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	res.Current = *currUsage
	res.Limit = *limit

	p.WriteResult(w, r, res)
}

// GetUsage gets a project's current usage and usage limit
func GetUsage(config *config.Config, r *http.Request) (
	current, limit *types.ProjectUsage,
	err error,
) {
	// read the project from the request
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	// query for the project limit; if not found, default to basic
	limitModel, err := config.Repo.ProjectUsage().ReadProjectUsage(proj.ID)

	if err != nil && errors.Is(err, gorm.ErrRecordNotFound) {
		copyBasic := types.BasicPlan
		limit = &copyBasic
	} else if err != nil {
		return nil, nil, err
	} else {
		limit = limitModel.ToProjectUsageType()
	}

	// query for the linked cluster counts
	clusters, err := config.Repo.Cluster().ListClustersByProjectID(proj.ID)

	if err != nil {
		return nil, nil, err
	}

	// query for the linked user counts
	roles, err := config.Repo.Project().ListProjectRoles(proj.ID)

	if err != nil {
		return nil, nil, err
	}

	usageCache, err := config.Repo.ProjectUsage().ReadProjectUsageCache(proj.ID)
	isCacheFound := true

	if isCacheFound = !errors.Is(err, gorm.ErrRecordNotFound); err != nil && isCacheFound {
		return nil, nil, err
	}

	// if the usage cache is 24 hours old, was not found, or usage is over limit,
	// re-query for the usage
	if !isCacheFound || usageCache.Is24HrOld() || usageCache.ResourceMemory > limit.ResourceMemory || usageCache.ResourceCPU > limit.ResourceCPU {
		cpu, memory, err := getResourceUsage(config, clusters)

		if err != nil {
			return nil, nil, err
		}

		if !isCacheFound {
			usageCache, err = config.Repo.ProjectUsage().CreateProjectUsageCache(&models.ProjectUsageCache{
				ProjectID:      proj.ID,
				ResourceCPU:    cpu,
				ResourceMemory: memory,
			})
		} else {
			usageCache.ResourceCPU = cpu
			usageCache.ResourceMemory = memory

			usageCache, err = config.Repo.ProjectUsage().UpdateProjectUsageCache(usageCache)
		}
	}

	return &types.ProjectUsage{
		ResourceCPU:    usageCache.ResourceCPU,
		ResourceMemory: usageCache.ResourceMemory,
		Clusters:       uint(len(clusters)),
		Users:          uint(len(roles)),
	}, limit, nil
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
