package types

import (
	"helm.sh/helm/v3/pkg/action"
	"helm.sh/helm/v3/pkg/release"
	v1 "k8s.io/api/core/v1"
)

// ReleaseListFilter is a struct that represents the various filter options used for
// retrieving the releases
type ReleaseListFilter struct {
	Namespace    string   `json:"namespace"`
	Limit        int      `json:"limit"`
	Skip         int      `json:"skip"`
	ByDate       bool     `json:"byDate"`
	StatusFilter []string `json:"statusFilter"`
}

// listStatesFromNames accepts the following list of names:
//
// "deployed", "uninstalled", "uninstalling", "pending-install", "pending-upgrade",
// "pending-rollback", "superseded", "failed"
//
// It returns an action.ListStates to be used in an action.List as filters for
// releases in a certain state.
func (h *ReleaseListFilter) listStatesFromNames() action.ListStates {
	var res action.ListStates = 0

	for _, name := range h.StatusFilter {
		res = res | res.FromName(name)
	}

	return res
}

// Apply sets the ReleaseListFilter options for an action.List
func (h *ReleaseListFilter) Apply(list *action.List) {
	if h.Namespace == "" {
		list.AllNamespaces = true
	}

	list.Limit = h.Limit
	list.Offset = h.Skip

	list.StateMask = h.listStatesFromNames()

	if h.ByDate {
		list.ByDate = true
	}
}

type ListReleasesRequest struct {
	*ReleaseListFilter
}

type ListReleasesResponse []*release.Release

type GetConfigMapRequest struct {
	Name string `schema:"name,required"`
}

type GetConfigMapResponse struct {
	*v1.ConfigMap
}

type ListConfigMapsResponse struct {
	*v1.ConfigMapList
}

type CreateConfigMapRequest struct {
	Name            string            `json:"name,required"`
	Variables       map[string]string `json:"variables,required"`
	SecretVariables map[string]string `json:"secret_variables,required"`
}

type CreateConfigMapResponse struct {
	*v1.ConfigMap
}
