package models

import (
	"gorm.io/gorm"

	"github.com/porter-dev/porter/api/types"
)

type Onboarding struct {
	gorm.Model

	ProjectID                      uint
	CurrentStep                    types.StepEnum
	ConnectedSource                types.ConnectedSourceType
	SkipRegistryConnection         bool
	SkipResourceProvision          bool
	RegistryConnectionID           uint
	RegistryConnectionCredentialID uint
	RegistryInfraID                uint
	RegistryInfraCredentialID      uint
	ClusterInfraID                 uint
	ClusterInfraCredentialID       uint
}

// ToOnboardingType generates an external types.OnboardingData to be shared over REST
func (o *Onboarding) ToOnboardingType() *types.OnboardingData {
	return &types.OnboardingData{
		CurrentStep:                    o.CurrentStep,
		ConnectedSource:                o.ConnectedSource,
		SkipRegistryConnection:         o.SkipRegistryConnection,
		SkipResourceProvision:          o.SkipResourceProvision,
		RegistryConnectionID:           o.RegistryConnectionID,
		RegistryConnectionCredentialID: o.RegistryConnectionCredentialID,
		RegistryInfraID:                o.RegistryInfraID,
		RegistryInfraCredentialID:      o.RegistryInfraCredentialID,
		ClusterInfraID:                 o.ClusterInfraID,
		ClusterInfraCredentialID:       o.ClusterInfraCredentialID,
	}
}
