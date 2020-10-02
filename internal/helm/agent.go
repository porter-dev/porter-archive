package helm

import (
	"helm.sh/helm/v3/pkg/action"
	"helm.sh/helm/v3/pkg/release"
)

// ListReleases lists releases based on a ListFilter
func ListReleases(
	actionConfig *action.Configuration,
	namespace string,
	filter *ListFilter,
) ([]*release.Release, error) {
	cmd := action.NewList(actionConfig)

	filter.apply(cmd)

	return cmd.Run()
}

// GetRelease returns the info of a release.
func GetRelease(
	actionConfig *action.Configuration,
	name string,
) (*release.Release, error) {
	// Namespace is already known by the RESTClientGetter.
	cmd := action.NewGet(actionConfig)

	return cmd.Run(name)
}
