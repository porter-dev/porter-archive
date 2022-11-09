package types

import (
	"github.com/porter-dev/porter/internal/helm/upgrade"
	"helm.sh/helm/v3/pkg/chart"
)

const (
	URLParamTemplateName    URLParam = "name"
	URLParamTemplateVersion URLParam = "version"
)

type TemplateGetBaseRequest struct {
	RepoURL string `schema:"repo_url"`
}

type ListTemplatesRequest struct {
	TemplateGetBaseRequest
}

type PorterTemplateSimple struct {
	// The name of the template
	Name string `json:"name"`

	// The list of valid versions for the template
	Versions []string `json:"versions"`

	// A description for the template
	Description string `json:"description"`

	// An image URI for the icon
	Icon string `json:"icon"`

	// The repo URL for the template
	RepoURL string `json:"repo_url,omitempty"`
}

// ListTemplatesResponse is how a chart gets displayed when listed
// swagger:model ListTemplatesResponse
type ListTemplatesResponse []PorterTemplateSimple

type GetTemplateRequest struct {
	TemplateGetBaseRequest
}

// GetTemplateResponse is a chart with detailed information and a form for reading
// swagger:model GetTemplateResponse
type GetTemplateResponse struct {
	Markdown string                 `json:"markdown"`
	Metadata *chart.Metadata        `json:"metadata"`
	Values   map[string]interface{} `json:"values"`
	Form     *FormYAML              `json:"form"`
	RepoURL  string                 `json:"repo_url,omitempty"`
}

type GetTemplateUpgradeNotesRequest struct {
	TemplateGetBaseRequest
	PrevVersion string `schema:"prev_version"`
}

// swagger:model GetTemplateUpgradeNotesResponse
type GetTemplateUpgradeNotesResponse upgrade.UpgradeFile
