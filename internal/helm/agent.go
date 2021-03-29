package helm

import (
	"fmt"

	"github.com/pkg/errors"
	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"golang.org/x/oauth2"
	"helm.sh/helm/v3/pkg/action"
	"helm.sh/helm/v3/pkg/chart"
	"helm.sh/helm/v3/pkg/release"
	"k8s.io/helm/pkg/chartutil"
)

// Agent is a Helm agent for performing helm operations
type Agent struct {
	ActionConfig *action.Configuration
	K8sAgent     *kubernetes.Agent
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

type UpgradeReleaseConfig struct {
	Name       string
	Values     map[string]interface{}
	Cluster    *models.Cluster
	Repo       repository.Repository
	Registries []*models.Registry
}

// UpgradeRelease upgrades a specific release with new values.yaml
func (a *Agent) UpgradeRelease(
	conf *UpgradeReleaseConfig,
	values string,
	doAuth *oauth2.Config,
) (*release.Release, error) {
	valuesYaml, err := chartutil.ReadValues([]byte(values))

	if err != nil {
		return nil, fmt.Errorf("Values could not be parsed: %v", err)
	}

	conf.Values = valuesYaml

	return a.UpgradeReleaseByValues(conf, doAuth)
}

// UpgradeReleaseByValues upgrades a release by unmarshaled yaml values
func (a *Agent) UpgradeReleaseByValues(
	conf *UpgradeReleaseConfig,
	doAuth *oauth2.Config,
) (*release.Release, error) {
	// grab the latest release
	rel, err := a.GetRelease(conf.Name, 0)

	if err != nil {
		return nil, fmt.Errorf("Could not get release to be upgraded: %v", err)
	}

	ch := rel.Chart

	cmd := action.NewUpgrade(a.ActionConfig)
	cmd.Namespace = rel.Namespace

	if conf.Cluster != nil && a.K8sAgent != nil && conf.Registries != nil && len(conf.Registries) > 0 {
		cmd.PostRenderer, err = NewDockerSecretsPostRenderer(
			conf.Cluster,
			conf.Repo,
			a.K8sAgent,
			rel.Namespace,
			conf.Registries,
			doAuth,
		)

		if err != nil {
			return nil, err
		}
	}

	res, err := cmd.Run(conf.Name, ch, conf.Values)

	if err != nil {
		return nil, fmt.Errorf("Upgrade failed: %v", err)
	}

	return res, nil
}

// InstallChartConfig is the config required to install a chart
type InstallChartConfig struct {
	Chart      *chart.Chart
	Name       string
	Namespace  string
	Values     map[string]interface{}
	Cluster    *models.Cluster
	Repo       repository.Repository
	Registries []*models.Registry
}

// InstallChartFromValuesBytes reads the raw values and calls Agent.InstallChart
func (a *Agent) InstallChartFromValuesBytes(
	conf *InstallChartConfig,
	values []byte,
	doAuth *oauth2.Config,
) (*release.Release, error) {
	valuesYaml, err := chartutil.ReadValues(values)

	if err != nil {
		return nil, fmt.Errorf("Values could not be parsed: %v", err)
	}

	conf.Values = valuesYaml

	return a.InstallChart(conf, doAuth)
}

// InstallChart installs a new chart
func (a *Agent) InstallChart(
	conf *InstallChartConfig,
	doAuth *oauth2.Config,
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

	var err error

	// only add the postrenderer if required fields exist
	if conf.Cluster != nil && a.K8sAgent != nil && conf.Registries != nil && len(conf.Registries) > 0 {
		cmd.PostRenderer, err = NewDockerSecretsPostRenderer(
			conf.Cluster,
			conf.Repo,
			a.K8sAgent,
			conf.Namespace,
			conf.Registries,
			doAuth,
		)

		if err != nil {
			return nil, err
		}
	}

	if req := conf.Chart.Metadata.Dependencies; req != nil {
		if err := action.CheckDependencies(conf.Chart, req); err != nil {
			// TODO: Handle dependency updates.
			return nil, err
		}
	}

	return cmd.Run(conf.Chart, conf.Values)
}

// UninstallChart uninstalls a chart
func (a *Agent) UninstallChart(
	name string,
) (*release.UninstallReleaseResponse, error) {
	cmd := action.NewUninstall(a.ActionConfig)
	return cmd.Run(name)
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
