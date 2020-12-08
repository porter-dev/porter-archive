package helm

import (
	"fmt"

	"github.com/pkg/errors"
	"helm.sh/helm/v3/pkg/action"
	"helm.sh/helm/v3/pkg/chart"
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
	valuesYaml, err := chartutil.ReadValues([]byte(values))

	if err != nil {
		return nil, fmt.Errorf("Values could not be parsed: %v", err)
	}

	return a.UpgradeReleaseByValues(name, valuesYaml)
}

// UpgradeReleaseByValues upgrades a release by unmarshaled yaml values
func (a *Agent) UpgradeReleaseByValues(
	name string,
	values map[string]interface{},
) (*release.Release, error) {
	// grab the latest release
	rel, err := a.GetRelease(name, 0)

	if err != nil {
		return nil, fmt.Errorf("Could not get release to be upgraded: %v", err)
	}

	ch := rel.Chart

	cmd := action.NewUpgrade(a.ActionConfig)
	res, err := cmd.Run(name, ch, values)

	if err != nil {
		return nil, fmt.Errorf("Upgrade failed: %v", err)
	}

	return res, nil
}

// InstallChartConfig is the config required to install a chart
type InstallChartConfig struct {
	Chart     *chart.Chart
	Name      string
	Namespace string
	Values    map[string]interface{}
}

// InstallChartFromValuesBytes reads the raw values and calls Agent.InstallChart
func (a *Agent) InstallChartFromValuesBytes(
	conf *InstallChartConfig,
	values []byte,
) (*release.Release, error) {
	valuesYaml, err := chartutil.ReadValues(values)

	if err != nil {
		return nil, fmt.Errorf("Values could not be parsed: %v", err)
	}

	conf.Values = valuesYaml

	return a.InstallChart(conf)
}

// InstallChart installs a new chart
func (a *Agent) InstallChart(
	conf *InstallChartConfig,
) (*release.Release, error) {
	cmd := action.NewInstall(a.ActionConfig)

	if cmd.Version == "" && cmd.Devel {
		cmd.Version = ">0.0.0-0"
	}

	cmd.ReleaseName = conf.Name
	cmd.Namespace = conf.Namespace

	if err := checkIfInstallable(conf.Chart); err != nil {
		return nil, err
	}

	// if chartRequested.Metadata.Deprecated {
	// 	return nil, fmt.Errorf("This chart is deprecated")
	// }

	if req := conf.Chart.Metadata.Dependencies; req != nil {
		if err := action.CheckDependencies(conf.Chart, req); err != nil {
			// TODO: Handle dependency updates.
			return nil, err
		}
	}

	return cmd.Run(conf.Chart, conf.Values)
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
