package stacks

import (
	"fmt"

	"github.com/porter-dev/porter/api/server/shared/config"
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

	stackRevision.Model = gorm.Model{}
	stackRevision.RevisionNumber++
	stackRevision.Resources = clonedAppResources
	stackRevision.SourceConfigs = clonedSourceConfigs

	_, err = config.Repo.Stack().AppendNewRevision(stackRevision)

	return err
}
