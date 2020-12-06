package helm

import (
	"fmt"

	"github.com/porter-dev/porter/internal/helm"
)

// ValuesTemplateWriter upgrades and installs charts by setting Helm values
type ValuesTemplateWriter struct {
	// The object to read from, identified by its group-version-kind
	Agent *helm.Agent

	// ChartPath for installing a chart
	ChartPath string

	// ReleaseName for upgrading the chart
	ReleaseName string
}

// Transform does nothing, since Helm handles the transforms internally
func (w *ValuesTemplateWriter) Transform() error {
	return nil
}

// Create installs a new chart, ChartPath must be set
func (w *ValuesTemplateWriter) Create(
	vals map[string]interface{},
) (map[string]interface{}, error) {
	if w.ChartPath != "" {
		return nil, fmt.Errorf("chart path not set")
	}

	_, err := w.Agent.InstallChartByValues(w.ChartPath, vals)

	if err != nil {
		return nil, err
	}

	return vals, nil
}

// Update upgrades a chart, ReleaseName must be set
func (w *ValuesTemplateWriter) Update(
	vals map[string]interface{},
) (map[string]interface{}, error) {
	if w.ReleaseName != "" {
		return nil, fmt.Errorf("release not set")
	}

	_, err := w.Agent.UpgradeReleaseByValues(w.ReleaseName, vals)

	if err != nil {
		return nil, err
	}

	return vals, nil
}
