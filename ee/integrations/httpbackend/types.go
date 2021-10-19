package httpbackend

type TerraformEvent string

const (
	PlannedChange TerraformEvent = "planned_change"
	ChangeSummary TerraformEvent = "change_summary"
	ApplyStart    TerraformEvent = "apply_start"
	ApplyProgress TerraformEvent = "apply_progress"
	ApplyComplete TerraformEvent = "apply_complete"
)

type DesiredTFState []Resource

type TFLogLine struct {
	Level     string         `json:"@level"`
	Message   string         `json:"@message"`
	Timestamp string         `json:"@timestamp"`
	Type      TerraformEvent `json:"type"`
	Change    Change         `json:"change"`
	Changes   Changes        `json:"changes"`
}

type Change struct {
	Resource Resource `json:"resource"`
	Action   string   `json:"action"`
}

type Resource struct {
	Addr         string `json:"addr"`
	ResourceType string `json:"resource_type"`
	ResourceName string `json:"resource_name"`
	Provider     string `json:"implied_provider"`
}

type Changes struct {
	Add       int    `json:"add"`
	Change    int    `json:"change"`
	Remove    int    `json:"remove"`
	Operation string `json:"operation"`
}

type TFState struct {
	Version          int         `json:"version"`
	TerraformVersion string      `json:"terraform_version"`
	Serial           int         `json:"serial"`
	Lineage          string      `json:"lineage"`
	Outputs          interface{} `json:"outputs"`
	Resources        interface{} `json:"resources"`
}
