package helm

import (
	"bytes"
	"context"
	"fmt"
	"runtime/debug"
	"strconv"
	"strings"
	"time"

	"github.com/porter-dev/porter/internal/telemetry"

	"github.com/pkg/errors"
	"github.com/porter-dev/porter/internal/helm/loader"
	"github.com/stefanmcshane/helm/pkg/action"
	"github.com/stefanmcshane/helm/pkg/chart"
	"github.com/stefanmcshane/helm/pkg/release"
	"github.com/stefanmcshane/helm/pkg/storage/driver"
	"golang.org/x/oauth2"
	corev1 "k8s.io/api/core/v1"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/helm/pkg/chartutil"

	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
)

// Agent is a Helm agent for performing helm operations
type Agent struct {
	ActionConfig *action.Configuration
	K8sAgent     *kubernetes.Agent
}

// ListReleases lists releases based on a ListFilter
func (a *Agent) ListReleases(
	ctx context.Context,
	namespace string,
	filter *types.ReleaseListFilter,
) ([]*release.Release, error) {
	ctx, span := telemetry.NewSpan(ctx, "helm-list-releases")
	defer span.End()

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "namespace", Value: namespace},
	)

	lsel := fmt.Sprintf("owner=helm,status in (%s)", strings.Join(filter.StatusFilter, ","))

	// list secrets
	secretList, err := a.K8sAgent.Clientset.CoreV1().Secrets(namespace).List(
		context.Background(),
		v1.ListOptions{
			LabelSelector: lsel,
		},
	)
	if err != nil {
		return nil, telemetry.Error(ctx, span, err, "error getting secret list")
	}

	// before decoding to helm release, only keep the latest releases for each chart
	latestMap := make(map[string]corev1.Secret)

	for _, secret := range secretList.Items {
		relName, relNameExists := secret.Labels["name"]

		if !relNameExists {
			continue
		}

		id := fmt.Sprintf("%s/%s", secret.Namespace, relName)

		if currLatest, exists := latestMap[id]; exists {
			// get version
			currVersionStr, currVersionExists := currLatest.Labels["version"]
			versionStr, versionExists := secret.Labels["version"]

			if versionExists && currVersionExists {
				currVersion, currErr := strconv.Atoi(currVersionStr)
				version, err := strconv.Atoi(versionStr)
				if currErr == nil && err == nil && currVersion < version {
					latestMap[id] = secret
				}
			}
		} else {
			latestMap[id] = secret
		}
	}

	chartList := []string{}
	res := make([]*release.Release, 0)

	for _, secret := range latestMap {
		rel, isErr, err := kubernetes.ParseSecretToHelmRelease(secret, chartList)

		if !isErr && err == nil {
			res = append(res, rel)
		}
	}

	return res, nil
}

// GetRelease returns the info of a release.
func (a *Agent) GetRelease(
	ctx context.Context,
	name string,
	version int,
	getDeps bool,
) (*release.Release, error) {
	ctx, span := telemetry.NewSpan(ctx, "helm-get-release")
	defer span.End()

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "name", Value: name},
		telemetry.AttributeKV{Key: "version", Value: version},
		telemetry.AttributeKV{Key: "getDeps", Value: getDeps},
	)

	// Namespace is already known by the RESTClientGetter.
	cmd := action.NewGet(a.ActionConfig)

	cmd.Version = version

	release, err := cmd.Run(name)
	if err != nil {
		return nil, telemetry.Error(ctx, span, err, "error running get release")
	}

	if getDeps && release.Chart != nil && release.Chart.Metadata != nil {
		for _, dep := range release.Chart.Metadata.Dependencies {
			// only search for dependency if it passes the condition specified in Chart.yaml
			if dep.Enabled {
				depExists := false

				for _, currDep := range release.Chart.Dependencies() {
					// we just case on name for now -- there might be edge cases we're missing
					// but this will cover 99% of cases
					if dep != nil && currDep != nil && dep.Name == currDep.Name() {
						depExists = true
						break
					}
				}

				if !depExists {
					depChart, err := loader.LoadChartPublic(ctx, dep.Repository, dep.Name, dep.Version)
					if err != nil {
						return nil, telemetry.Error(ctx, span, err, fmt.Sprintf("Error retrieving chart dependency %s/%s-%s", dep.Repository, dep.Name, dep.Version))
					}

					release.Chart.AddDependency(depChart)
				}
			}
		}
	}

	return release, err
}

// DeleteReleaseRevision deletes a specific revision of a release
func (a *Agent) DeleteReleaseRevision(
	ctx context.Context,
	name string,
	version int,
) error {
	ctx, span := telemetry.NewSpan(ctx, "helm-delete-release-history")
	defer span.End()

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "name", Value: name},
		telemetry.AttributeKV{Key: "version", Value: version},
	)

	_, err := a.ActionConfig.Releases.Delete(name, version)

	return err
}

// GetReleaseHistory returns a list of charts for a specific release
func (a *Agent) GetReleaseHistory(
	ctx context.Context,
	name string,
) ([]*release.Release, error) {
	ctx, span := telemetry.NewSpan(ctx, "helm-get-release-history")
	defer span.End()

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "name", Value: name},
	)

	cmd := action.NewHistory(a.ActionConfig)

	return cmd.Run(name)
}

type UpgradeReleaseConfig struct {
	Name       string
	Values     map[string]interface{}
	Cluster    *models.Cluster
	Repo       repository.Repository
	Registries []*models.Registry

	// Optional, if chart should be overriden
	Chart *chart.Chart

	// Optional, if chart is part of a Porter Stack
	StackName     string
	StackRevision uint
}

// UpgradeRelease upgrades a specific release with new values.yaml
func (a *Agent) UpgradeRelease(
	ctx context.Context,
	conf *UpgradeReleaseConfig,
	values string,
	doAuth *oauth2.Config,
	disablePullSecretsInjection bool,
	ignoreDependencies bool,
) (*release.Release, error) {
	ctx, span := telemetry.NewSpan(ctx, "helm-upgrade-release")
	defer span.End()

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "project-id", Value: conf.Cluster.ProjectID},
		telemetry.AttributeKV{Key: "cluster-id", Value: conf.Cluster.ID},
		telemetry.AttributeKV{Key: "name", Value: conf.Name},
		telemetry.AttributeKV{Key: "stack-name", Value: conf.StackName},
		telemetry.AttributeKV{Key: "stack-revision", Value: conf.StackRevision},
	)

	valuesYaml, err := chartutil.ReadValues([]byte(values))
	if err != nil {
		return nil, telemetry.Error(ctx, span, err, "Values could not be parsed")
	}

	conf.Values = valuesYaml

	return a.UpgradeReleaseByValues(ctx, conf, doAuth, disablePullSecretsInjection, ignoreDependencies)
}

// UpgradeReleaseByValues upgrades a release by unmarshaled yaml values
func (a *Agent) UpgradeReleaseByValues(
	ctx context.Context,
	conf *UpgradeReleaseConfig,
	doAuth *oauth2.Config,
	disablePullSecretsInjection bool,
	ignoreDependencies bool,
) (*release.Release, error) {
	ctx, span := telemetry.NewSpan(ctx, "helm-upgrade-release-by-values")
	defer span.End()

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "project-id", Value: conf.Cluster.ProjectID},
		telemetry.AttributeKV{Key: "cluster-id", Value: conf.Cluster.ID},
		telemetry.AttributeKV{Key: "name", Value: conf.Name},
		telemetry.AttributeKV{Key: "stack-name", Value: conf.StackName},
		telemetry.AttributeKV{Key: "stack-revision", Value: conf.StackRevision},
	)

	// grab the latest release
	rel, err := a.GetRelease(ctx, conf.Name, 0, !ignoreDependencies)
	if err != nil {
		return nil, telemetry.Error(ctx, span, err, "Could not get release to be upgraded")
	}

	ch := rel.Chart

	if conf.Chart != nil {
		ch = conf.Chart
	}

	cmd := action.NewUpgrade(a.ActionConfig)
	cmd.Namespace = rel.Namespace

	cmd.PostRenderer, err = NewPorterPostrenderer(
		conf.Cluster,
		conf.Repo,
		a.K8sAgent,
		rel.Namespace,
		conf.Registries,
		doAuth,
		disablePullSecretsInjection,
	)

	if err != nil {
		return nil, telemetry.Error(ctx, span, err, "error getting porter postrenderer")
	}

	if conf.StackName != "" && conf.StackRevision > 0 {
		conf.Values["stack"] = map[string]interface{}{
			"enabled":  true,
			"name":     conf.StackName,
			"revision": conf.StackRevision,
		}
	}

	res, err := cmd.Run(conf.Name, ch, conf.Values)
	if err != nil {
		// refer: https://github.com/helm/helm/blob/release-3.8/pkg/action/action.go#L62
		// issue tracker: https://github.com/helm/helm/issues/4558
		if err.Error() == "another operation (install/upgrade/rollback) is in progress" {
			secretList, err := a.K8sAgent.Clientset.CoreV1().Secrets(rel.Namespace).List(
				context.Background(),
				v1.ListOptions{
					LabelSelector: fmt.Sprintf("owner=helm,status in (pending-install, pending-upgrade, pending-rollback),name=%s", rel.Name),
				},
			)
			if err != nil {
				return nil, telemetry.Error(ctx, span, err, "error getting secret list")
			}

			if len(secretList.Items) > 0 {
				mostRecentSecret := secretList.Items[0]

				for i := 1; i < len(secretList.Items); i += 1 {
					oldVersion, _ := strconv.Atoi(mostRecentSecret.Labels["version"])
					newVersion, _ := strconv.Atoi(secretList.Items[i].Labels["version"])

					if oldVersion < newVersion {
						mostRecentSecret = secretList.Items[i]
					}
				}

				if time.Since(mostRecentSecret.CreationTimestamp.Time) >= time.Minute {
					helmSecrets := driver.NewSecrets(a.K8sAgent.Clientset.CoreV1().Secrets(rel.Namespace))

					rel.Info.Status = release.StatusFailed

					err = helmSecrets.Update(mostRecentSecret.GetName(), rel)

					if err != nil {
						return nil, telemetry.Error(ctx, span, err, "error updating helm secrets")
					}

					// retry upgrade
					res, err = cmd.Run(conf.Name, ch, conf.Values)

					if err != nil {
						return nil, telemetry.Error(ctx, span, err, "error running upgrade after updating helm secrets")
					}

					return res, nil
				} else {
					// ask the user to wait for about a minute before retrying for the above fix to kick in
					return nil, telemetry.Error(ctx, span, err, "another operation (install/upgrade/rollback) is in progress. If this error persists, please wait for 60 seconds to force an upgrade")
				}
			}
		} else if strings.Contains(err.Error(), "current release manifest contains removed kubernetes api(s)") || strings.Contains(err.Error(), "resource mapping not found for name") {
			// ref: https://helm.sh/docs/topics/kubernetes_apis/#updating-api-versions-of-a-release-manifest
			// in this case, we manually update the secret containing the new manifests
			secretList, err := a.K8sAgent.Clientset.CoreV1().Secrets(rel.Namespace).List(
				context.Background(),
				v1.ListOptions{
					LabelSelector: fmt.Sprintf("owner=helm,name=%s", rel.Name),
				},
			)
			if err != nil {
				return nil, telemetry.Error(ctx, span, err, "error getting secret list")
			}

			if len(secretList.Items) > 0 {
				mostRecentSecret := secretList.Items[0]

				for i := 1; i < len(secretList.Items); i += 1 {
					oldVersion, _ := strconv.Atoi(mostRecentSecret.Labels["version"])
					newVersion, _ := strconv.Atoi(secretList.Items[i].Labels["version"])

					if oldVersion < newVersion {
						mostRecentSecret = secretList.Items[i]
					}
				}

				// run the equivalent of `helm template` to get the manifest string for the new release
				installCmd := action.NewInstall(a.ActionConfig)

				installCmd.ReleaseName = conf.Name
				installCmd.Namespace = rel.Namespace
				installCmd.DryRun = true
				installCmd.Replace = true

				installCmd.ClientOnly = false
				installCmd.IncludeCRDs = true

				newRelDryRun, err := installCmd.Run(ch, conf.Values)
				if err != nil {
					return nil, telemetry.Error(ctx, span, err, "error running install cmd")
				}

				oldManifestBuffer := bytes.NewBufferString(rel.Manifest)
				newManifestBuffer := bytes.NewBufferString(newRelDryRun.Manifest)

				versionMapper := &DeprecatedAPIVersionMapper{}

				updatedManifestBuffer, err := versionMapper.Run(oldManifestBuffer, newManifestBuffer)
				if err != nil {
					return nil, telemetry.Error(ctx, span, err, "error running version mapper")
				}

				rel.Manifest = updatedManifestBuffer.String()

				helmSecrets := driver.NewSecrets(a.K8sAgent.Clientset.CoreV1().Secrets(rel.Namespace))

				err = helmSecrets.Update(mostRecentSecret.GetName(), rel)

				if err != nil {
					return nil, telemetry.Error(ctx, span, err, "error updating helm secret")
				}

				res, err := cmd.Run(conf.Name, ch, conf.Values)
				if err != nil {
					return nil, telemetry.Error(ctx, span, err, "error running upgrade after updating helm secrets")
				}

				return res, nil
			}
		}

		return nil, telemetry.Error(ctx, span, err, "error running upgrade")
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
	ctx context.Context,
	conf *InstallChartConfig,
	values []byte,
	doAuth *oauth2.Config,
	disablePullSecretsInjection bool,
) (*release.Release, error) {
	ctx, span := telemetry.NewSpan(ctx, "helm-install-chart-from-values-bytes")
	defer span.End()

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "project-id", Value: conf.Cluster.ProjectID},
		telemetry.AttributeKV{Key: "cluster-id", Value: conf.Cluster.ID},
		telemetry.AttributeKV{Key: "chart-name", Value: conf.Name},
		telemetry.AttributeKV{Key: "chart-namespace", Value: conf.Namespace},
	)

	valuesYaml, err := chartutil.ReadValues(values)
	if err != nil {
		return nil, telemetry.Error(ctx, span, err, "Values could not be parsed")
	}

	conf.Values = valuesYaml

	return a.InstallChart(ctx, conf, doAuth, disablePullSecretsInjection)
}

// InstallChart installs a new chart
func (a *Agent) InstallChart(
	ctx context.Context,
	conf *InstallChartConfig,
	doAuth *oauth2.Config,
	disablePullSecretsInjection bool,
) (*release.Release, error) {
	defer func() {
		if r := recover(); r != nil {
			fmt.Println("stacktrace from panic: \n" + string(debug.Stack()))
		}
	}()

	ctx, span := telemetry.NewSpan(ctx, "helm-install-chart")
	defer span.End()

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "project-id", Value: conf.Cluster.ProjectID},
		telemetry.AttributeKV{Key: "cluster-id", Value: conf.Cluster.ID},
		telemetry.AttributeKV{Key: "chart-name", Value: conf.Name},
		telemetry.AttributeKV{Key: "chart-namespace", Value: conf.Namespace},
	)

	cmd := action.NewInstall(a.ActionConfig)

	if cmd.Version == "" && cmd.Devel {
		cmd.Version = ">0.0.0-0"
	}

	cmd.ReleaseName = conf.Name
	cmd.Namespace = conf.Namespace
	cmd.Timeout = 300 * time.Second

	if err := checkIfInstallable(conf.Chart); err != nil {
		return nil, telemetry.Error(ctx, span, err, "error checking if installable")
	}

	var err error

	cmd.PostRenderer, err = NewPorterPostrenderer(
		conf.Cluster,
		conf.Repo,
		a.K8sAgent,
		conf.Namespace,
		conf.Registries,
		doAuth,
		disablePullSecretsInjection,
	)

	if err != nil {
		return nil, telemetry.Error(ctx, span, err, "error getting post renderer")
	}

	if req := conf.Chart.Metadata.Dependencies; req != nil {
		for _, dep := range req {
			depChart, err := loader.LoadChartPublic(ctx, dep.Repository, dep.Name, dep.Version)
			if err != nil {
				return nil, telemetry.Error(ctx, span, err, fmt.Sprintf("error retrieving chart dependency %s/%s-%s", dep.Repository, dep.Name, dep.Version))
			}

			conf.Chart.AddDependency(depChart)
		}
	}

	return cmd.Run(conf.Chart, conf.Values)
}

// UpgradeInstallChart installs a new chart if it doesn't exist, otherwise it upgrades it
func (a *Agent) UpgradeInstallChart(
	ctx context.Context,
	conf *InstallChartConfig,
	doAuth *oauth2.Config,
	disablePullSecretsInjection bool,
) (*release.Release, error) {
	defer func() {
		if r := recover(); r != nil {
			fmt.Println("stacktrace from panic: \n" + string(debug.Stack()))
		}
	}()

	ctx, span := telemetry.NewSpan(ctx, "helm-upgrade-install-chart")
	defer span.End()

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "project-id", Value: conf.Cluster.ProjectID},
		telemetry.AttributeKV{Key: "cluster-id", Value: conf.Cluster.ID},
		telemetry.AttributeKV{Key: "chart-name", Value: conf.Name},
		telemetry.AttributeKV{Key: "chart-namespace", Value: conf.Namespace},
	)

	cmd := action.NewUpgrade(a.ActionConfig)
	cmd.Install = true

	if cmd.Version == "" && cmd.Devel {
		cmd.Version = ">0.0.0-0"
	}

	cmd.Namespace = conf.Namespace
	cmd.Timeout = 300 * time.Second

	if err := checkIfInstallable(conf.Chart); err != nil {
		return nil, telemetry.Error(ctx, span, err, "error checking if installable")
	}

	var err error

	cmd.PostRenderer, err = NewPorterPostrenderer(
		conf.Cluster,
		conf.Repo,
		a.K8sAgent,
		conf.Namespace,
		conf.Registries,
		doAuth,
		disablePullSecretsInjection,
	)

	if err != nil {
		return nil, telemetry.Error(ctx, span, err, "error getting post renderer")
	}

	if req := conf.Chart.Metadata.Dependencies; req != nil {
		for _, dep := range req {
			depChart, err := loader.LoadChartPublic(ctx, dep.Repository, dep.Name, dep.Version)
			if err != nil {
				return nil, telemetry.Error(ctx, span, err, fmt.Sprintf("error retrieving chart dependency %s/%s-%s", dep.Repository, dep.Name, dep.Version))
			}

			conf.Chart.AddDependency(depChart)
		}
	}

	return cmd.Run(conf.Name, conf.Chart, conf.Values)
}

// UninstallChart uninstalls a chart
func (a *Agent) UninstallChart(
	ctx context.Context,
	name string,
) (*release.UninstallReleaseResponse, error) {
	ctx, span := telemetry.NewSpan(ctx, "helm-uninstall-chart")
	defer span.End()

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "chart-name", Value: name})

	cmd := action.NewUninstall(a.ActionConfig)
	return cmd.Run(name)
}

// RollbackRelease rolls a release back to a specified revision/version
func (a *Agent) RollbackRelease(
	ctx context.Context,
	name string,
	version int,
) error {
	ctx, span := telemetry.NewSpan(ctx, "helm-rollback-release")
	defer span.End()

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "name", Value: name},
		telemetry.AttributeKV{Key: "version", Value: version},
	)

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
