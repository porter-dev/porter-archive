package types

import "github.com/porter-dev/porter/provisioner/pb"

type TerraformEvent string

const (
	PlannedChange TerraformEvent = "planned_change"
	ChangeSummary TerraformEvent = "change_summary"
	ApplyStart    TerraformEvent = "apply_start"
	ApplyProgress TerraformEvent = "apply_progress"
	ApplyErrored  TerraformEvent = "apply_errored"
	ApplyComplete TerraformEvent = "apply_complete"
	Diagnostic    TerraformEvent = "diagnostic"
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

func (t *TFLogLine) ToPBType() *pb.TerraformLog {
	var tfEventType pb.TerraformEvent

	switch t.Type {
	case PlannedChange:
		tfEventType = pb.TerraformEvent_PLANNED_CHANGE
	case ChangeSummary:
		tfEventType = pb.TerraformEvent_CHANGE_SUMMARY
	case ApplyStart:
		tfEventType = pb.TerraformEvent_APPLY_START
	case ApplyProgress:
		tfEventType = pb.TerraformEvent_APPLY_PROGRESS
	case ApplyErrored:
		tfEventType = pb.TerraformEvent_APPLY_ERRORED
	case ApplyComplete:
		tfEventType = pb.TerraformEvent_APPLY_COMPLETE
	case Diagnostic:
		tfEventType = pb.TerraformEvent_DIAGNOSTIC
	}

	return &pb.TerraformLog{
		Level:     t.Level,
		Message:   t.Message,
		Timestamp: t.Timestamp,
		Type:      tfEventType,
		Hook: &pb.TerraformHook{
			Resource: &pb.TerraformResource{
				Addr:         t.Hook.Resource.Addr,
				Resource:     t.Hook.Resource.Resource,
				ResourceType: t.Hook.Resource.ResourceType,
				ResourceName: t.Hook.Resource.ResourceName,
				Provider:     t.Hook.Resource.Provider,
				Errored: &pb.TerraformErrored{
					ErroredOut:   t.Hook.Resource.Errored.ErroredOut,
					ErrorSummary: t.Hook.Resource.Errored.ErrorSummary,
				},
			},
		},
		Change: &pb.TerraformChange{
			Resource: &pb.TerraformResource{
				Addr:         t.Change.Resource.Addr,
				Resource:     t.Change.Resource.Resource,
				ResourceType: t.Change.Resource.ResourceType,
				ResourceName: t.Change.Resource.ResourceName,
				Provider:     t.Change.Resource.Provider,
				Errored: &pb.TerraformErrored{
					ErroredOut:   t.Change.Resource.Errored.ErroredOut,
					ErrorSummary: t.Change.Resource.Errored.ErrorSummary,
				},
			},
		},
		Changes: &pb.TerraformChanges{
			Add:       int64(t.Changes.Add),
			Change:    int64(t.Changes.Change),
			Remove:    int64(t.Changes.Remove),
			Operation: t.Changes.Operation,
		},
		Diagnostic: &pb.DiagnosticDetail{
			Severity: t.Diagnostic.Severity,
			Summary:  t.Diagnostic.Summary,
			Address:  t.Diagnostic.Address,
		},
	}
}

func ToProvisionerType(pbTFLog *pb.TerraformLog) *TFLogLine {
	var tfEventType TerraformEvent

	switch pbTFLog.Type {
	case pb.TerraformEvent_PLANNED_CHANGE:
		tfEventType = PlannedChange
	case pb.TerraformEvent_CHANGE_SUMMARY:
		tfEventType = ChangeSummary
	case pb.TerraformEvent_APPLY_START:
		tfEventType = ApplyStart
	case pb.TerraformEvent_APPLY_PROGRESS:
		tfEventType = ApplyProgress
	case pb.TerraformEvent_APPLY_ERRORED:
		tfEventType = ApplyErrored
	case pb.TerraformEvent_APPLY_COMPLETE:
		tfEventType = ApplyComplete
	case pb.TerraformEvent_DIAGNOSTIC:
		tfEventType = Diagnostic
	}

	return &TFLogLine{
		Level:     pbTFLog.Level,
		Message:   pbTFLog.Message,
		Timestamp: pbTFLog.Timestamp,
		Type:      tfEventType,
		Hook: Hook{
			Resource: Resource{
				Addr:         pbTFLog.Hook.Resource.Addr,
				Resource:     pbTFLog.Hook.Resource.Resource,
				ResourceType: pbTFLog.Hook.Resource.ResourceType,
				ResourceName: pbTFLog.Hook.Resource.ResourceName,
				Provider:     pbTFLog.Hook.Resource.Provider,
				Errored: Errored{
					ErroredOut:   pbTFLog.Hook.Resource.Errored.ErroredOut,
					ErrorSummary: pbTFLog.Hook.Resource.Errored.ErrorSummary,
				},
			},
		},
		Change: Change{
			Resource: Resource{
				Addr:         pbTFLog.Change.Resource.Addr,
				Resource:     pbTFLog.Change.Resource.Resource,
				ResourceType: pbTFLog.Change.Resource.ResourceType,
				ResourceName: pbTFLog.Change.Resource.ResourceName,
				Provider:     pbTFLog.Change.Resource.Provider,
				Errored: Errored{
					ErroredOut:   pbTFLog.Change.Resource.Errored.ErroredOut,
					ErrorSummary: pbTFLog.Change.Resource.Errored.ErrorSummary,
				},
			},
		},
		Changes: Changes{
			Add:       int(pbTFLog.Changes.Add),
			Change:    int(pbTFLog.Changes.Change),
			Remove:    int(pbTFLog.Changes.Remove),
			Operation: pbTFLog.Changes.Operation,
		},
		Diagnostic: DiagnosticDetail{
			Severity: pbTFLog.Diagnostic.Severity,
			Summary:  pbTFLog.Diagnostic.Summary,
			Address:  pbTFLog.Diagnostic.Address,
		},
	}
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
	Detail   string `json:"detail"`
}
