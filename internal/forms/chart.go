package forms

import (
	"github.com/porter-dev/porter/internal/helm"
	"github.com/porter-dev/porter/internal/repository"
)

// ChartForm is the generic base type for CRUD operations on charts
type ChartForm struct {
	HelmOptions *helm.Form `json:"helm" form:"required"`
	UserID      uint       `json:"user_id"`
}

// PopulateHelmOptions uses the passed user ID to populate the HelmOptions object
func (cf *ChartForm) PopulateHelmOptions(repo repository.UserRepository) error {
	user, err := repo.ReadUser(cf.UserID)

	if err != nil {
		return err
	}

	cf.HelmOptions.AllowedContexts = user.ContextToSlice()
	cf.HelmOptions.KubeConfig = user.RawKubeConfig

	return nil
}

// ListChartForm represents the accepted values for listing Helm charts
type ListChartForm struct {
	ChartForm
	ListFilter *helm.ListFilter `json:"filter" form:"required"`
}

// GetChartForm represents the accepted values for getting a single Helm chart
type GetChartForm struct {
	ChartForm
	Name     string `json:"name" form:"required"`
	Revision int    `json:"release"`
}
