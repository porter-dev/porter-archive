package jobs

import "time"

type helmRevisionsCountTracker struct {
	enqueueTime time.Time
}

func NewHelmRevisionsCountTracker(enqueueTime time.Time) *helmRevisionsCountTracker {
	return &helmRevisionsCountTracker{
		enqueueTime: enqueueTime,
	}
}

func (t *helmRevisionsCountTracker) ID() string {
	return "helm-revisions-count-tracker"
}

func (t *helmRevisionsCountTracker) EnqueueTime() time.Time {
	return t.enqueueTime
}

func (t *helmRevisionsCountTracker) Run() error {
	return nil
}

func (t *helmRevisionsCountTracker) SetData([]byte) {}
