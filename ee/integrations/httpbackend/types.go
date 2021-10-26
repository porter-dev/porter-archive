package httpbackend

type TerraformEvent string

const (
	PlannedChange TerraformEvent = "planned_change"
	ChangeSummary TerraformEvent = "change_summary"
	ApplyStart    TerraformEvent = "apply_start"
	ApplyProgress TerraformEvent = "apply_progress"
	ApplyErrored  TerraformEvent = "apply_errored"
	ApplyComplete TerraformEvent = "apply_complete"

	Diagnostic TerraformEvent = "diagnostic"
)

type DesiredTFState []Resource

type TFLogLine struct {
	Level      string           `json:"@level"`
	Message    string           `json:"@message"`
	Timestamp  string           `json:"@timestamp"`
	Type       TerraformEvent   `json:"type"`
	Hook       Hook             `json:"hook,omitempty"`
	Change     Change           `json:"change,omitempty"`
	Changes    Changes          `json:"changes,omitempty"`
	Diagnostic DiagnosticDetail `json:"diagnostic"`
}

type Hook struct {
	Resource Resource `json:"resource,omitempty"`
}

type Change struct {
	Resource Resource `json:"resource"`
	Action   string   `json:"action"`
}

type Resource struct {
	Addr         string `json:"addr"`
	Resource     string `json:"resource"`
	ResourceType string `json:"resource_type"`
	ResourceName string `json:"resource_name"`
	Provider     string `json:"implied_provider"`

	// auxiliary types added to resouce
	// these are used by porter internally
	// to mark which resources in particular errored out
	Errored Errored `json:"errored,omitempty"`
}

type Errored struct {
	ErroredOut   bool   `json:"errored_out"`
	ErrorSummary string `json:"error_context,omitempty"`
}

type Changes struct {
	Add       int    `json:"add"`
	Change    int    `json:"change"`
	Remove    int    `json:"remove"`
	Operation string `json:"operation"`
}

type DiagnosticDetail struct {
	Severity string `json:"severity"`
	Summary  string `json:"summary"`
	Address  string `json:"address"`
}

type TFState struct {
	Version          int         `json:"version"`
	TerraformVersion string      `json:"terraform_version"`
	Serial           int         `json:"serial"`
	Lineage          string      `json:"lineage"`
	Outputs          interface{} `json:"outputs"`
	Resources        interface{} `json:"resources"`
}
