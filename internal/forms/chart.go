package forms

import (
	"github.com/porter-dev/porter/internal/helm"
	"github.com/porter-dev/porter/internal/repository"
)

// ListChartForm represents the accepted values for listing Helm charts
type ListChartForm struct {
	HelmOptions *helm.Form       `json:"helm" form:"required"`
	ListFilter  *helm.ListFilter `json:"filter" form:"required"`
	UserID      uint             `json:"user_id"`
}

// PopulateHelmOptions uses the passed user ID to populate the HelmOptions object
func (lcf *ListChartForm) PopulateHelmOptions(repo repository.UserRepository) error {
	user, err := repo.ReadUser(lcf.UserID)

	if err != nil {
		return err
	}

	lcf.HelmOptions.AllowedContexts = user.Contexts
	lcf.HelmOptions.KubeConfig = user.RawKubeConfig
	return nil
}
