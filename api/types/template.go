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
	Name        string   `json:"name"`
	Versions    []string `json:"versions"`
	Description string   `json:"description"`
	Icon        string   `json:"icon"`
}

// ListTemplatesResponse is how a chart gets displayed when listed
type ListTemplatesResponse []PorterTemplateSimple

type GetTemplateRequest struct {
	TemplateGetBaseRequest
}

// GetTemplateResponse is a chart with detailed information and a form for reading
type GetTemplateResponse struct {
	Markdown string                 `json:"markdown"`
	Metadata *chart.Metadata        `json:"metadata"`
	Values   map[string]interface{} `json:"values"`
	Form     *FormYAML              `json:"form"`
}

type GetTemplateUpgradeNotesRequest struct {
	TemplateGetBaseRequest
	PrevVersion string `schema:"prev_version"`
}

type GetTemplateUpgradeNotesResponse upgrade.UpgradeFile
