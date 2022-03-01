package notifications

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
)

type NotificationsBackend interface {
	Name() string
	Actions() map[string]*types.NotificationAction
	Apply(*http.Request, []string) error
}

type NotificationsManager struct {
	backends map[string]NotificationsBackend
}

func NewNotificationsManager(config *config.Config) *NotificationsManager {
	manager := &NotificationsManager{
		backends: make(map[string]NotificationsBackend),
	}

	prometheusBackend := newPrometheusBackend(config)
	manager.backends[prometheusBackend.Name()] = prometheusBackend

	return manager
}

func (m *NotificationsManager) GetBackends() map[string]NotificationsBackend {
	return m.backends
}
