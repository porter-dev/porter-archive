//go:build ee
// +build ee

package main

import (
	"fmt"

	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type projectIteratorMethod func(project *models.Project) error

type clusterIteratorMethod func(cluster *models.Cluster) error

const stepSize = 100

type IterateProjectsSelector struct {
	NotFreeTier bool
}

func iterateProjects(opts IterateProjectsSelector, fn projectIteratorMethod) error {
	// get count of model
	var count int64

	if err := db.Model(&models.Project{}).Count(&count).Error; err != nil {
		return err
	}

	// iterate (count / stepSize) + 1 times using Limit and Offset
	for i := 0; i < (int(count)/stepSize)+1; i++ {
		projects := []*models.Project{}

		if err := db.Order("id asc").Offset(i * stepSize).Limit(stepSize).Find(&projects).Error; err != nil {
			return err
		}

		for _, proj := range projects {
			// if there are conditions, check the conditions and skip if match
			if opts.NotFreeTier {
				// query for the project usage
				if usage, err := repo.ProjectUsage().ReadProjectUsage(proj.ID); err != nil || isFreeTier(usage) {
					continue
				}
			}

			fmt.Println("iterating on project:", proj.Name)

			err := fn(proj)

			if err != nil {
				return err
			}
		}
	}

	return nil
}

func isFreeTier(projUsage *models.ProjectUsage) bool {
	return types.BasicPlan.Clusters == projUsage.Clusters &&
		types.BasicPlan.Users == projUsage.Users &&
		types.BasicPlan.ResourceCPU == projUsage.ResourceCPU &&
		types.BasicPlan.ResourceMemory == projUsage.ResourceMemory
}

func iterateClusters(fn clusterIteratorMethod) error {
	// get count of model
	var count int64

	if err := db.Model(&models.Cluster{}).Count(&count).Error; err != nil {
		return err
	}

	// iterate (count / stepSize) + 1 times using Limit and Offset
	for i := 0; i < (int(count)/stepSize)+1; i++ {
		clusters := []*models.Cluster{}

		if err := db.Order("id asc").Offset(i * stepSize).Limit(stepSize).Find(&clusters).Error; err != nil {
			return err
		}

		for _, clusterSimple := range clusters {
			cluster, err := repo.Cluster().ReadCluster(clusterSimple.ProjectID, clusterSimple.ID)

			if err != nil {
				return err
			}

			fmt.Println("iterating on cluster:", cluster.Name)

			err = fn(cluster)

			if err != nil {
				return err
			}
		}
	}

	return nil
}
