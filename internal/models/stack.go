package models

import (
	"github.com/porter-dev/porter/api/types"
	"gorm.io/gorm"
)

// Stack represents the metadata for a stack on Porter
type Stack struct {
	gorm.Model

	ProjectID uint

	ClusterID uint

	Namespace string

	Name string

	UID string `gorm:"unique"`

	Revisions []StackRevision
}

func (s *Stack) ToStackType() *types.Stack {
	revisions := []types.StackRevisionMeta{}

	for _, rev := range s.Revisions {
		revisions = append(revisions, rev.ToStackRevisionMetaType(s.UID))
	}

	var latestRevision *types.StackRevision

	if len(s.Revisions) > 0 {
		latestRevision = s.Revisions[0].ToStackRevisionType(s.UID)
	}

	return &types.Stack{
		CreatedAt:      s.CreatedAt,
		UpdatedAt:      s.UpdatedAt,
		Name:           s.Name,
		Namespace:      s.Namespace,
		ID:             s.UID,
		LatestRevision: latestRevision,
		Revisions:      revisions,
	}
}

// StackRevision represents the revision information for the stack
type StackRevision struct {
	gorm.Model

	RevisionNumber uint

	StackID uint

	Status string

	Reason  string
	Message string

	Resources []StackResource

	SourceConfigs []StackSourceConfig
}

func (s StackRevision) ToStackRevisionMetaType(stackID string) types.StackRevisionMeta {
	return types.StackRevisionMeta{
		CreatedAt: s.CreatedAt,
		ID:        s.RevisionNumber,
		Status:    types.StackRevisionStatus(s.Status),
		StackID:   stackID,
	}
}

func (s StackRevision) ToStackRevisionType(stackID string) *types.StackRevision {
	metaType := s.ToStackRevisionMetaType(stackID)

	sourceConfigs := make([]types.StackSourceConfig, 0)

	for _, sourceConfig := range s.SourceConfigs {
		sourceConfigs = append(sourceConfigs, *sourceConfig.ToStackSourceConfigType(stackID, s.RevisionNumber))
	}

	resources := make([]types.StackResource, 0)

	for _, stackResource := range s.Resources {
		resources = append(resources, *stackResource.ToStackResource(stackID, s.RevisionNumber, s.SourceConfigs))
	}

	return &types.StackRevision{
		StackRevisionMeta: &metaType,
		SourceConfigs:     sourceConfigs,
		Resources:         resources,
		Reason:            s.Reason,
		Message:           s.Message,
	}
}

type StackResource struct {
	gorm.Model

	Name string

	UID string

	StackRevisionID uint

	StackSourceConfigUID string

	HelmRevisionID uint

	Values []byte

	TemplateRepoURL string

	TemplateName string

	TemplateVersion string
}

func (s StackResource) ToStackResource(stackID string, stackRevisionID uint, sourceConfigs []StackSourceConfig) *types.StackResource {
	// find the relevant source config
	var linkedSourceConfig StackSourceConfig

	for _, sourceConfig := range sourceConfigs {
		if sourceConfig.UID == s.StackSourceConfigUID {
			linkedSourceConfig = sourceConfig
			break
		}
	}

	return &types.StackResource{
		CreatedAt:         s.CreatedAt,
		UpdatedAt:         s.UpdatedAt,
		Name:              s.Name,
		ID:                s.UID,
		StackSourceConfig: linkedSourceConfig.ToStackSourceConfigType(stackID, stackRevisionID),
		StackID:           stackID,
		// Note that `StackRevisionID` on the API refers to the numerical auto-incremented revision ID, not
		// the stack_revision_id in the database.
		StackRevisionID: stackRevisionID,
		StackAppData: &types.StackResourceAppData{
			TemplateRepoURL: s.TemplateRepoURL,
			TemplateName:    s.TemplateName,
			TemplateVersion: s.TemplateVersion,
		},
	}
}

type StackSourceConfig struct {
	gorm.Model

	StackRevisionID uint

	Name string

	UID string

	ImageRepoURI string

	ImageTag string

	// TODO: add git-specific information
}

func (s StackSourceConfig) ToStackSourceConfigType(stackID string, stackRevisionID uint) *types.StackSourceConfig {
	return &types.StackSourceConfig{
		CreatedAt:       s.CreatedAt,
		UpdatedAt:       s.UpdatedAt,
		StackID:         stackID,
		StackRevisionID: stackRevisionID,
		Name:            s.Name,
		ID:              s.UID,
		ImageRepoURI:    s.ImageRepoURI,
		ImageTag:        s.ImageTag,
	}
}
