package stacks

import (
	"errors"
	"fmt"

	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"gorm.io/gorm"
	"helm.sh/helm/v3/pkg/release"
)

func UpdateHelmRevision(config *config.Config, projID, clusterID uint, rel *release.Release) error {
	// read release by stack ID
	relModel, err := config.Repo.Release().ReadRelease(clusterID, rel.Name, rel.Namespace)

	if err != nil {
		return err
	}

	if relModel.StackResourceID == 0 {
		return nil
	}

	stackResource, err := config.Repo.Stack().ReadStackResource(relModel.StackResourceID)

	if err != nil {
		return err
	}

	// read the revision number corresponding and create a new revision of the stack
	oldStackRevision, err := config.Repo.Stack().ReadStackRevision(stackResource.StackRevisionID)

	if err != nil {
		return err
	}

	// get the latest revision for that stack
	stack, err := config.Repo.Stack().ReadStackByID(projID, oldStackRevision.StackID)

	if err != nil {
		return err
	}

	if len(stack.Revisions) == 0 {
		return fmt.Errorf("length of stack revision list was 0")
	}

	currStackRevision := stack.Revisions[0]
	stackRevision := &currStackRevision

	clonedSourceConfigs, err := CloneSourceConfigs(stackRevision.SourceConfigs)

	if err != nil {
		return err
	}

	clonedAppResources, err := CloneAppResources(stackRevision.Resources, stackRevision.SourceConfigs, clonedSourceConfigs)

	if err != nil {
		return err
	}

	for i, appResource := range clonedAppResources {
		if appResource.Name == rel.Name {
			clonedAppResources[i].HelmRevisionID = uint(rel.Version)
		}
	}

	clonedEnvGroups, err := CloneEnvGroups(stackRevision.EnvGroups)

	if err != nil {
		return err
	}

	stackRevision.Model = gorm.Model{}
	stackRevision.RevisionNumber++
	stackRevision.Resources = clonedAppResources
	stackRevision.SourceConfigs = clonedSourceConfigs
	stackRevision.EnvGroups = clonedEnvGroups
	stackRevision.Status = "deployed"
	stackRevision.Reason = "ApplicationUpgrade"
	stackRevision.Message = fmt.Sprintf("The application %s was updated from version %d to %d", rel.Name, rel.Version-1, rel.Version)

	_, err = config.Repo.Stack().AppendNewRevision(stackRevision)

	return err
}

func UpdateEnvGroupVersion(config *config.Config, projID, clusterID uint, envGroup *types.EnvGroup) error {
	// read stack env group by params
	stackEnvGroup, err := config.Repo.Stack().ReadStackEnvGroupFirstMatch(projID, clusterID, envGroup.Namespace, envGroup.Name)

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil
		}

		return err
	}

	// read the revision number corresponding and create a new revision of the stack
	oldStackRevision, err := config.Repo.Stack().ReadStackRevision(stackEnvGroup.StackRevisionID)

	if err != nil {
		return err
	}

	// get the latest revision for that stack
	stack, err := config.Repo.Stack().ReadStackByID(projID, oldStackRevision.StackID)

	if err != nil {
		return err
	}

	if len(stack.Revisions) == 0 {
		return fmt.Errorf("length of stack revision list was 0")
	}

	currStackRevision := stack.Revisions[0]
	stackRevision := &currStackRevision

	clonedSourceConfigs, err := CloneSourceConfigs(stackRevision.SourceConfigs)

	if err != nil {
		return err
	}

	clonedAppResources, err := CloneAppResources(stackRevision.Resources, stackRevision.SourceConfigs, clonedSourceConfigs)

	if err != nil {
		return err
	}

	clonedEnvGroups, err := CloneEnvGroups(stackRevision.EnvGroups)

	if err != nil {
		return err
	}

	for i, clonedEnvGroup := range clonedEnvGroups {
		if clonedEnvGroup.Name == envGroup.Name {
			clonedEnvGroups[i].EnvGroupVersion = envGroup.Version
		}
	}

	// find all synced apps which should have an updated revision number
	for i, clonedAppResource := range clonedAppResources {
		for _, appName := range envGroup.Applications {
			if clonedAppResource.Name == appName {
				clonedAppResources[i].HelmRevisionID = clonedAppResource.HelmRevisionID + 1
			}
		}
	}

	stackRevision.Model = gorm.Model{}
	stackRevision.RevisionNumber++
	stackRevision.Resources = clonedAppResources
	stackRevision.SourceConfigs = clonedSourceConfigs
	stackRevision.EnvGroups = clonedEnvGroups
	stackRevision.Reason = "EnvGroupUpgrade"
	stackRevision.Message = fmt.Sprintf("The environment group %s was updated from version %d to %d", envGroup.Name, envGroup.Version-1, envGroup.Version)
	stackRevision.Status = "deployed"

	_, err = config.Repo.Stack().AppendNewRevision(stackRevision)

	return err
}

func GetStackForEnvGroup(config *config.Config, projID, clusterID uint, envGroup *types.EnvGroup) (string, error) {
	// read stack env group by params
	stackEnvGroup, err := config.Repo.Stack().ReadStackEnvGroupFirstMatch(projID, clusterID, envGroup.Namespace, envGroup.Name)

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", nil
		}

		return "", err
	}

	// read the revision number corresponding and create a new revision of the stack
	oldStackRevision, err := config.Repo.Stack().ReadStackRevision(stackEnvGroup.StackRevisionID)

	if err != nil {
		return "", err
	}

	// get the latest revision for that stack
	stack, err := config.Repo.Stack().ReadStackByID(projID, oldStackRevision.StackID)

	if err != nil {
		return "", err
	}

	return stack.UID, nil
}
