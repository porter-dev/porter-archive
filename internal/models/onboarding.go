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
	RegistryConnectionProvider     string
	RegistryInfraID                uint
	RegistryInfraCredentialID      uint
	RegistryInfraProvider          string
	ClusterInfraID                 uint
	ClusterInfraCredentialID       uint
	ClusterInfraProvider           string
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
		RegistryConnectionProvider:     o.RegistryConnectionProvider,
		RegistryInfraID:                o.RegistryInfraID,
		RegistryInfraCredentialID:      o.RegistryInfraCredentialID,
		RegistryInfraProvider:          o.RegistryInfraProvider,
		ClusterInfraID:                 o.ClusterInfraID,
		ClusterInfraCredentialID:       o.ClusterInfraCredentialID,
		ClusterInfraProvider:           o.ClusterInfraProvider,
	}
}
