package forms

import (
	"net/url"
	"strconv"

	"github.com/porter-dev/porter/internal/helm"
	"github.com/porter-dev/porter/internal/repository"
)

// ReleaseForm is the generic base type for CRUD operations on releases
type ReleaseForm struct {
	*helm.Form
}

// PopulateHelmOptionsFromQueryParams populates fields in the ReleaseForm using the passed
// url.Values (the parsed query params)
func (rf *ReleaseForm) PopulateHelmOptionsFromQueryParams(
	vals url.Values,
	repo repository.ClusterRepository,
) error {
	if clusterID, ok := vals["cluster_id"]; ok && len(clusterID) == 1 {
		id, err := strconv.ParseUint(clusterID[0], 10, 64)

		if err != nil {
			return err
		}

		cluster, err := repo.ReadCluster(uint(id))

		if err != nil {
			return err
		}
		rf.Cluster = cluster
	}

	if namespace, ok := vals["namespace"]; ok && len(namespace) == 1 {
		rf.Namespace = namespace[0]
	}

	if storage, ok := vals["storage"]; ok && len(storage) == 1 {
		rf.Storage = storage[0]
	}

	return nil
}

// ListReleaseForm represents the accepted values for listing Helm releases
type ListReleaseForm struct {
	*ReleaseForm
	*helm.ListFilter
}

// PopulateListFromQueryParams populates fields in the ListReleaseForm using the passed
// url.Values (the parsed query params)
func (lrf *ListReleaseForm) PopulateListFromQueryParams(
	vals url.Values,
	_ repository.ClusterRepository,
) error {
	if namespace, ok := vals["namespace"]; ok && len(namespace) == 1 {
		lrf.ListFilter.Namespace = namespace[0]
	}

	if limit, ok := vals["limit"]; ok && len(limit) == 1 {
		if limitInt, err := strconv.ParseInt(limit[0], 10, 64); err == nil {
			lrf.ListFilter.Limit = int(limitInt)
		}
	}

	if skip, ok := vals["skip"]; ok && len(skip) == 1 {
		if skipInt, err := strconv.ParseInt(skip[0], 10, 64); err == nil {
			lrf.ListFilter.Skip = int(skipInt)
		}
	}

	if byDate, ok := vals["byDate"]; ok && len(byDate) == 1 {
		if byDateBool, err := strconv.ParseBool(byDate[0]); err == nil {
			lrf.ListFilter.ByDate = byDateBool
		}
	}

	if statusFilter, ok := vals["statusFilter"]; ok {
		lrf.ListFilter.StatusFilter = statusFilter
	}

	return nil
}

// GetReleaseForm represents the accepted values for getting a single Helm release
type GetReleaseForm struct {
	*ReleaseForm
	Name     string `json:"name" form:"required"`
	Revision int    `json:"revision"`
}

// ListReleaseHistoryForm represents the accepted values for getting a single Helm release
type ListReleaseHistoryForm struct {
	*ReleaseForm
	Name string `json:"name" form:"required"`
}

// RollbackReleaseForm represents the accepted values for getting a single Helm release
type RollbackReleaseForm struct {
	*ReleaseForm
	Name     string `json:"name" form:"required"`
	Revision int    `json:"revision" form:"required"`
}

// UpgradeReleaseForm represents the accepted values for updating a Helm release
type UpgradeReleaseForm struct {
	*ReleaseForm
	Name   string `json:"name" form:"required"`
	Values string `json:"values" form:"required"`
}

// ChartTemplateForm represents the accepted values for installing a new chart from a template.
type ChartTemplateForm struct {
	TemplateName string                 `json:"templateName" form:"required"`
	ImageURL     string                 `json:"imageURL" form:"required"`
	FormValues   map[string]interface{} `json:"formValues"`
	Name         string                 `json:"name"`
}

// InstallChartTemplateForm represents the accepted values for installing a new chart from a template.
type InstallChartTemplateForm struct {
	*ReleaseForm
	*ChartTemplateForm

	// optional git action config
	GithubActionConfig *CreateGitActionOptional `json:"github_action,omitempty"`
}
