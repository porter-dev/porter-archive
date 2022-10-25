package helm

import (
	"fmt"

	"github.com/porter-dev/porter/internal/helm"
	"helm.sh/helm/v3/pkg/chart"
)

// TemplateWriter upgrades and installs charts by setting Helm values
type TemplateWriter struct {
	// The object to read from, identified by its group-version-kind
	Agent *helm.Agent

	// Chart that gets installed
	Chart *chart.Chart

	// ReleaseName for upgrading the chart or installing
	ReleaseName string

	// Namespace it gets installed to
	Namespace string
}

// Transform does nothing, since Helm handles the transforms internally
func (w *TemplateWriter) Transform() error {
	return nil
}

// Create installs a new chart, ChartPath must be set
func (w *TemplateWriter) Create(
	vals map[string]interface{},
) (map[string]interface{}, error) {
	if w.Chart == nil {
		return nil, fmt.Errorf("chart must be set")
	}

	conf := &helm.InstallChartConfig{
		Chart:     w.Chart,
		Name:      w.ReleaseName,
		Namespace: w.Namespace,
		Values:    vals,
	}

	_, err := w.Agent.InstallChart(conf, nil, false)

	if err != nil {
		return nil, err
	}

	return vals, nil
}

// Update upgrades a chart, ReleaseName must be set
func (w *TemplateWriter) Update(
	vals map[string]interface{},
) (map[string]interface{}, error) {
	if w.ReleaseName != "" {
		return nil, fmt.Errorf("release not set")
	}

	conf := &helm.UpgradeReleaseConfig{
		Name:   w.ReleaseName,
		Values: vals,
	}

	_, err := w.Agent.UpgradeReleaseByValues(conf, nil, false)

	if err != nil {
		return nil, err
	}

	return vals, nil
}
