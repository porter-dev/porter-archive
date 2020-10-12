package forms

import (
	"net/url"
	"strconv"

	"github.com/porter-dev/porter/internal/helm"
	"github.com/porter-dev/porter/internal/repository"
)

// ChartForm is the generic base type for CRUD operations on charts
type ChartForm struct {
	*helm.Form
}

// PopulateHelmOptionsFromQueryParams populates fields in the ChartForm using the passed
// url.Values (the parsed query params)
func (cf *ChartForm) PopulateHelmOptionsFromQueryParams(vals url.Values) {
	if context, ok := vals["context"]; ok && len(context) == 1 {
		cf.Context = context[0]
	}

	if namespace, ok := vals["namespace"]; ok && len(namespace) == 1 {
		cf.Namespace = namespace[0]
	}

	if storage, ok := vals["storage"]; ok && len(storage) == 1 {
		cf.Storage = storage[0]
	}
}

// PopulateHelmOptionsFromUserID uses the passed user ID to populate the HelmOptions object
func (cf *ChartForm) PopulateHelmOptionsFromUserID(userID uint, repo repository.UserRepository) error {
	user, err := repo.ReadUser(userID)

	if err != nil {
		return err
	}

	cf.AllowedContexts = user.ContextToSlice()
	cf.KubeConfig = user.RawKubeConfig

	return nil
}

// ListChartForm represents the accepted values for listing Helm charts
type ListChartForm struct {
	*ChartForm
	*helm.ListFilter
}

// PopulateListFromQueryParams populates fields in the ListChartForm using the passed
// url.Values (the parsed query params). It calls the underlying
// PopulateHelmOptionsFromQueryParams
func (lcf *ListChartForm) PopulateListFromQueryParams(vals url.Values) {
	lcf.ChartForm.PopulateHelmOptionsFromQueryParams(vals)

	if namespace, ok := vals["namespace"]; ok && len(namespace) == 1 {
		lcf.ListFilter.Namespace = namespace[0]
	}

	if limit, ok := vals["limit"]; ok && len(limit) == 1 {
		if limitInt, err := strconv.ParseInt(limit[0], 10, 64); err == nil {
			lcf.ListFilter.Limit = int(limitInt)
		}
	}

	if skip, ok := vals["skip"]; ok && len(skip) == 1 {
		if skipInt, err := strconv.ParseInt(skip[0], 10, 64); err == nil {
			lcf.ListFilter.Skip = int(skipInt)
		}
	}

	if byDate, ok := vals["byDate"]; ok && len(byDate) == 1 {
		if byDateBool, err := strconv.ParseBool(byDate[0]); err == nil {
			lcf.ListFilter.ByDate = byDateBool
		}
	}

	if statusFilter, ok := vals["statusFilter"]; ok {
		lcf.ListFilter.StatusFilter = statusFilter
	}
}

// GetChartForm represents the accepted values for getting a single Helm chart
type GetChartForm struct {
	*ChartForm
	Name     string `json:"name" form:"required"`
	Revision int    `json:"revision"`
}

// ListChartHistoryForm represents the accepted values for getting a single Helm chart
type ListChartHistoryForm struct {
	*ChartForm
	Name string `json:"name" form:"required"`
}

// RollbackChartForm represents the accepted values for getting a single Helm chart
type RollbackChartForm struct {
	*ChartForm
	Name     string `json:"name" form:"required"`
	Revision int    `json:"revision" form:"required"`
}

// UpgradeChartForm represents the accepted values for updating a Helm chart
type UpgradeChartForm struct {
	*ChartForm
	Name   string `json:"name" form:"required"`
	Values string `json:"values" form:"required"`
}
