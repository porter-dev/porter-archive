package repo

import (
	"fmt"

	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/helm/loader"
	"github.com/porter-dev/porter/internal/models"
	"helm.sh/helm/v3/pkg/chart"

	"github.com/porter-dev/porter/internal/repository"
)

// HelmRepo wraps the gorm HelmRepo model
type HelmRepo models.HelmRepo

// ListCharts lists Porter charts for a given helm repo
func (hr *HelmRepo) ListCharts(repo repository.Repository) (types.ListTemplatesResponse, error) {
	if hr.BasicAuthIntegrationID != 0 {
		return hr.listChartsBasic(repo)
	}

	return nil, fmt.Errorf("error listing charts")
}

// GetChart retrieves a Porter chart for a given helm repo
func (hr *HelmRepo) GetChart(
	repo repository.Repository,
	chartName, chartVersion string,
) (*chart.Chart, error) {
	if hr.BasicAuthIntegrationID != 0 {
		return hr.getChartBasic(repo, chartName, chartVersion)
	}

	return nil, fmt.Errorf("error listing charts")
}

func (hr *HelmRepo) listChartsBasic(
	repo repository.Repository,
) (types.ListTemplatesResponse, error) {
	// get the basic auth integration
	basic, err := repo.BasicIntegration().ReadBasicIntegration(
		hr.ProjectID,
		hr.BasicAuthIntegrationID,
	)

	if err != nil {
		return nil, err
	}

	client := &loader.BasicAuthClient{
		Username: string(basic.Username),
		Password: string(basic.Password),
	}

	repoIndex, err := loader.LoadRepoIndex(client, hr.RepoURL)

	if err != nil {
		return nil, err
	}

	return loader.RepoIndexToPorterChartList(repoIndex, hr.RepoURL), nil
}

func (hr *HelmRepo) getChartBasic(
	repo repository.Repository,
	chartName, chartVersion string,
) (*chart.Chart, error) {
	// get the basic auth integration
	basic, err := repo.BasicIntegration().ReadBasicIntegration(
		hr.ProjectID,
		hr.BasicAuthIntegrationID,
	)

	if err != nil {
		return nil, err
	}

	client := &loader.BasicAuthClient{
		Username: string(basic.Username),
		Password: string(basic.Password),
	}

	return loader.LoadChart(client, hr.RepoURL, chartName, chartVersion)
}

func ValidateRepoURL(
	defaultAddonRepoURL, defaultAppRepoURL string,
	hrs []*models.HelmRepo,
	repo_url string,
) bool {
	if repo_url == defaultAddonRepoURL || repo_url == defaultAppRepoURL {
		return true
	}

	// otherwise, iterate through helm repos
	for _, hr := range hrs {
		if hr.RepoURL == repo_url {
			return true
		}
	}

	return false
}
