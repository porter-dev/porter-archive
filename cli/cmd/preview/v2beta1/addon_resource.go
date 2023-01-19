package v2beta1

import "github.com/porter-dev/switchboard/pkg/types"

func (a *AddonResource) GetName() string {
	if a == nil || a.Name == nil {
		return ""
	}

	return *a.Name
}

func (a *AddonResource) GetDependsOn() []string {
	var dependsOn []string

	if a == nil || a.DependsOn == nil {
		return dependsOn
	}

	for _, d := range a.DependsOn {
		if d == nil {
			continue
		}

		dependsOn = append(dependsOn, *d)
	}

	return dependsOn
}

func (a *AddonResource) getV1Addon() (*types.Resource, error) {
	return &types.Resource{
		Name: a.GetName(),
		Source: map[string]interface{}{
			"name":    a.Chart.GetName(),
			"repo":    a.Chart.GetURL(),
			"version": a.Chart.GetVersion(),
		},
		DependsOn: a.GetDependsOn(),
		Config:    a.HelmValues,
	}, nil
}
