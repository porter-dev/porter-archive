package helm

import (
	"fmt"

	"helm.sh/helm/v3/pkg/action"
	"helm.sh/helm/v3/pkg/release"
	"k8s.io/helm/pkg/chartutil"
)

// Agent is a Helm agent for performing helm operations
type Agent struct {
	ActionConfig *action.Configuration
}

// ListReleases lists releases based on a ListFilter
func (a *Agent) ListReleases(
	namespace string,
	filter *ListFilter,
) ([]*release.Release, error) {
	cmd := action.NewList(a.ActionConfig)

	filter.apply(cmd)

	return cmd.Run()
}

// GetRelease returns the info of a release.
func (a *Agent) GetRelease(
	name string,
	version int,
) (*release.Release, error) {
	// Namespace is already known by the RESTClientGetter.
	cmd := action.NewGet(a.ActionConfig)

	cmd.Version = version

	return cmd.Run(name)
}

// GetReleaseHistory returns a list of charts for a specific release
func (a *Agent) GetReleaseHistory(
	name string,
) ([]*release.Release, error) {
	cmd := action.NewHistory(a.ActionConfig)

	return cmd.Run(name)
}

// UpgradeRelease upgrades a specific release with new values.yaml
func (a *Agent) UpgradeRelease(
	name string,
	values string,
) (*release.Release, error) {
	// grab the latest release
	rel, err := a.GetRelease(name, 0)

	if err != nil {
		return nil, fmt.Errorf("Could not get release to be upgraded: %v", err)
	}

	ch := rel.Chart

	cmd := action.NewUpgrade(a.ActionConfig)
	valuesYaml, err := chartutil.ReadValues([]byte(values))

	if err != nil {
		return nil, fmt.Errorf("Values could not be parsed: %v", err)
	}

	res, err := cmd.Run(name, ch, valuesYaml)

	if err != nil {
		return nil, fmt.Errorf("Upgrade failed: %v", err)
	}

	return res, nil
}

// RollbackRelease rolls a release back to a specified revision/version
func (a *Agent) RollbackRelease(
	name string,
	version int,
) error {
	cmd := action.NewRollback(a.ActionConfig)
	cmd.Version = version
	return cmd.Run(name)
}
