package notifier

import "github.com/porter-dev/porter/api/types"

type IncidentNotifier interface {
	NotifyNew(incident *types.Incident, url string) error
	NotifyResolved(incident *types.Incident, url string) error
}

type MultiIncidentNotifier struct {
	notifiers []IncidentNotifier
}

func NewMultiIncidentNotifier(notifiers ...IncidentNotifier) IncidentNotifier {
	return &MultiIncidentNotifier{notifiers}
}

func (m *MultiIncidentNotifier) NotifyNew(incident *types.Incident, url string) error {
	for _, n := range m.notifiers {
		if err := n.NotifyNew(incident, url); err != nil {
			return err
		}
	}

	return nil
}

func (m *MultiIncidentNotifier) NotifyResolved(incident *types.Incident, url string) error {
	for _, n := range m.notifiers {
		if err := n.NotifyResolved(incident, url); err != nil {
			return err
		}
	}

	return nil
}
