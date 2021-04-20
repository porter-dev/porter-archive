package helm

import (
	"helm.sh/helm/v3/pkg/action"
)

// ListFilter is a struct that represents the various filter options used for
// retrieving the releases
type ListFilter struct {
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
func (h *ListFilter) listStatesFromNames() action.ListStates {
	var res action.ListStates = 0

	for _, name := range h.StatusFilter {
		res = res | res.FromName(name)
	}

	return res
}

// apply sets the ListFilter options for an action.List
func (h *ListFilter) apply(list *action.List) {
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
