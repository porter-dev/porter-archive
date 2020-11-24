package helm

import (
	"fmt"

	"github.com/pkg/errors"
	"helm.sh/helm/v3/pkg/action"
	"helm.sh/helm/v3/pkg/chart"
	"helm.sh/helm/v3/pkg/chart/loader"
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

// InstallChart installs a new chart by URL, absolute or relative filepaths.
// Equivalent to `helm install [CHART_NAME] [cp]` where cp is one of the following:
//  1) Absolute URL: https://example.com/charts/nginx-1.2.3.tgz
//  2) path to packaged chart ./nginx-1.2.3.tgz
//  3) path to unpacked chart ./nginx
func (a *Agent) InstallChart(
	cp string,
	values []byte,
) (*release.Release, error) {
	cmd := action.NewInstall(a.ActionConfig)
	valuesYaml, err := chartutil.ReadValues(values)

	if err != nil {
		return nil, fmt.Errorf("Values could not be parsed: %v", err)
	}

	// Only supports filepaths for now, URL option WIP.
	// Check chart dependencies to make sure all are present in /charts
	chartRequested, err := loader.Load(cp)
	if err != nil {
		return nil, err
	}

	if err := checkIfInstallable(chartRequested); err != nil {
		return nil, err
	}

	if chartRequested.Metadata.Deprecated {
		return nil, fmt.Errorf("This chart is deprecated")
	}

	if req := chartRequested.Metadata.Dependencies; req != nil {
		if err := action.CheckDependencies(chartRequested, req); err != nil {
			// TODO: Handle dependency updates.
			return nil, err
		}
	}

	return cmd.Run(chartRequested, valuesYaml)
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

// ------------------------ Helm agent helper functions ------------------------ //

// checkIfInstallable validates if a chart can be installed
// Application chart type is only installable
func checkIfInstallable(ch *chart.Chart) error {
	switch ch.Metadata.Type {
	case "", "application":
		return nil
	}
	return errors.Errorf("%s charts are not installable", ch.Metadata.Type)
}
