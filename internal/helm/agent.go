package helm

import (
	"helm.sh/helm/v3/pkg/action"
	"helm.sh/helm/v3/pkg/release"
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
