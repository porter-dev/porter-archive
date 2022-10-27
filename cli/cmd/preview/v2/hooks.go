package v2

import (
	api "github.com/porter-dev/porter/api/client"
	switchboardTypes "github.com/porter-dev/switchboard/pkg/types"
)

type VariablesHook struct {
	client   *api.Client
	resGroup *switchboardTypes.ResourceGroup
}

func NewCloneEnvGroupHook(client *api.Client, resourceGroup *switchboardTypes.ResourceGroup) *VariablesHook {
	return &VariablesHook{
		client:   client,
		resGroup: resourceGroup,
	}
}
