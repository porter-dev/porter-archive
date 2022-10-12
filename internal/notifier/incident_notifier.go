package notifier

import "github.com/porter-dev/porter/api/types"

type IncidentNotifier interface {
	NotifyNew(incident *types.Incident, url string) error
	NotifyResolved(incident *types.Incident, url string) error
}

type MultiIncidentNotifier struct {
	notifConf *types.NotificationConfig
	notifiers []IncidentNotifier
}

func NewMultiIncidentNotifier(notifConf *types.NotificationConfig, notifiers ...IncidentNotifier) IncidentNotifier {
	return &MultiIncidentNotifier{notifConf, notifiers}
}

func (m *MultiIncidentNotifier) NotifyNew(incident *types.Incident, url string) error {
	// if notification config exists and notifs are disabled for this release, or failure notifications
	// are disabled, do not alert
	if m.notifConf != nil && (!m.notifConf.Enabled || !m.notifConf.Failure) {
		return nil
	}

	for _, n := range m.notifiers {
		if err := n.NotifyNew(incident, url); err != nil {
			return err
		}
	}

	return nil
}

func (m *MultiIncidentNotifier) NotifyResolved(incident *types.Incident, url string) error {
	// if notification config exists and notifs are disabled for this release, or failure notifications
	// are disabled, do not alert
	if m.notifConf != nil && (!m.notifConf.Enabled || !m.notifConf.Failure) {
		return nil
	}

	for _, n := range m.notifiers {
		if err := n.NotifyResolved(incident, url); err != nil {
			return err
		}
	}

	return nil
}
