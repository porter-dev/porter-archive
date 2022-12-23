package types

import (
	"time"

	"helm.sh/helm/v3/pkg/action"
	v1 "k8s.io/api/core/v1"
)

const (
	URLParamPodName         URLParam = "name"
	URLParamIngressName     URLParam = "name"
	URLParamEnvGroupName    URLParam = "name"
	URLParamEnvGroupVersion URLParam = "version"
)

// ReleaseListFilter is a struct that represents the various filter options used for
// retrieving the releases
type ReleaseListFilter struct {
	// swagger:ignore
	Namespace string `json:"namespace"`

	// the pagination limit
	//
	// in: query
	// example: 50
	Limit int `json:"limit"`

	// how many items to skip
	//
	// in: query
	// example: 10
	Skip int `json:"skip"`

	// whether to sort by date
	//
	// in: query
	// example: false
	ByDate bool `json:"byDate"`

	// which helm statuses to filter by
	//
	// in: query
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

// swagger:model
type ListReleasesResponse []*Release

type GetConfigMapRequest struct {
	Name string `schema:"name,required"`
}

type GetConfigMapResponse struct {
	*v1.ConfigMap
}

type ListConfigMapsResponse struct {
	*v1.ConfigMapList
}

type ConfigMapInput struct {
	Name            string
	Namespace       string
	Variables       map[string]string
	SecretVariables map[string]string
}

type CreateConfigMapRequest struct {
	Name            string            `json:"name,required"`
	Variables       map[string]string `json:"variables,required"`
	SecretVariables map[string]string `json:"secret_variables,required"`
}

type EnvGroup struct {
	MetaVersion  uint              `json:"meta_version"`
	CreatedAt    time.Time         `json:"created_at"`
	Version      uint              `json:"version"`
	Name         string            `json:"name"`
	Namespace    string            `json:"namespace"`
	Applications []string          `json:"applications"`
	Variables    map[string]string `json:"variables"`
}

type EnvGroupMeta struct {
	MetaVersion uint      `json:"meta_version"`
	CreatedAt   time.Time `json:"created_at"`
	Version     uint      `json:"version"`
	Name        string    `json:"name"`
	Namespace   string    `json:"namespace"`
}

type GetEnvGroupRequest struct {
	Name    string `schema:"name,required"`
	Version uint   `schema:"version"`
}

type CloneEnvGroupRequest struct {
	Namespace string `json:"namespace" form:"required"`
	Name      string `json:"name" form:"required,dns1123"`
	CloneName string `json:"clone_name,dns1123"`
	Version   uint   `json:"version"`
}

type GetEnvGroupAllRequest struct {
	Name string `schema:"name,required"`
}

type DeleteEnvGroupRequest struct {
	Name string `json:"name,required"`
}

type AddEnvGroupApplicationRequest struct {
	Name            string `json:"name" form:"required,dns1123"`
	ApplicationName string `json:"app_name" form:"required"`
}

type ListEnvGroupsResponse []*EnvGroupMeta

// CreateEnvGroupRequest represents the request body to create or update an env group
//
// swagger:model
type CreateEnvGroupRequest struct {
	// the name of the env group to create or update
	// example: prod-env-group
	Name string `json:"name" form:"required,dns1123"`

	// the variables to include in the env group
	Variables map[string]string `json:"variables" form:"required"`

	// the secret variables to include in the env group
	SecretVariables map[string]string `json:"secret_variables"`
}

type CreateConfigMapResponse struct {
	*v1.ConfigMap
}

type UpdateConfigMapRequest struct {
	Name            string            `json:"name,required"`
	Variables       map[string]string `json:"variables,required"`
	SecretVariables map[string]string `json:"secret_variables,required"`
}

type UpdateConfigMapResponse struct {
	*v1.ConfigMap
}

type RenameConfigMapRequest struct {
	Name    string `json:"name,required"`
	NewName string `json:"new_name,required"`
}

type RenameConfigMapResponse struct {
	*v1.ConfigMap
}

type DeleteConfigMapRequest struct {
	Name string `schema:"name,required"`
}

type GetPodLogsRequest struct {
	Container string `schema:"container_name"`
}

type GetPreviousPodLogsRequest struct {
	Container string `schema:"container_name"`
}

type GetPreviousPodLogsResponse struct {
	PrevLogs []string `json:"previous_logs"`
}

type GetJobsRequest struct {
	Revision uint `schema:"revision"`
}

type GetJobRunsRequest struct {
	Status string `schema:"status"`
	Sort   string `schema:"sort"`
}

type StreamJobRunsRequest struct {
	Name string `schema:"name"`
}

type GetEnvGroupResponse struct {
	*EnvGroup
	StackID string `json:"stack_id,omitempty"`
}

// V1EnvGroupReleaseRequest represents the request body to add or remove a release in an env group
//
// swagger:model
type V1EnvGroupReleaseRequest struct {
	ReleaseName string `json:"release_name" form:"required,dns1123"`
}

// V1EnvGroupResponse defines an env group
//
// swagger:model
type V1EnvGroupResponse struct {
	// the UTC timestamp in RFC 3339 format indicating the creation time of the env group
	CreatedAt time.Time `json:"created_at"`

	// the version of the env group
	Version uint `json:"version"`

	// the name of the env group
	Name string `json:"name"`

	// the list of releases linked to this env group
	Releases []string `json:"releases"`

	// the variables contained in this env group
	Variables map[string]string `json:"variables"`

	// the ID of the stack containing this env group (if any)
	StackID string `json:"stack_id,omitempty"`
}

// V1EnvGroupsAllVersionsResponse represents the response body containing all versions of an env group
//
// swagger:model
type V1EnvGroupsAllVersionsResponse []*V1EnvGroupResponse

type V1EnvGroupMeta struct {
	// the UTC timestamp in RFC 3339 format indicating the creation time of the env group
	CreatedAt time.Time `json:"created_at"`

	// the name of the env group
	Name string `json:"name"`

	// the ID of the stack containing this env group (if any)
	StackID string `json:"stack_id,omitempty"`
}

// V1ListAllEnvGroupsResponse represents the response body containing the list of env groups
//
// swagger:model
type V1ListAllEnvGroupsResponse []*V1EnvGroupMeta
