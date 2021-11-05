package repository

import (
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type BuildEventRepository interface {
	CreateEventContainer(am *models.EventContainer) (*models.EventContainer, error)
	CreateSubEvent(am *models.SubEvent) (*models.SubEvent, error)
	ReadEventsByContainerID(id uint) ([]*models.SubEvent, error)
	ReadEventContainer(id uint) (*models.EventContainer, error)
	ReadSubEvent(id uint) (*models.SubEvent, error)
	AppendEvent(container *models.EventContainer, event *models.SubEvent) error
}

type KubeEventRepository interface {
	CreateEvent(event *models.KubeEvent) (*models.KubeEvent, error)
	AppendSubEvent(event *models.KubeEvent, subEvent *models.KubeSubEvent) error
	ReadEvent(id uint, projID uint, clusterID uint) (*models.KubeEvent, error)
	ReadEventByGroup(projID uint, clusterID uint, opts *types.GroupOptions) (*models.KubeEvent, error)
	ListEventsByProjectID(
		projectID uint,
		clusterID uint,
		opts *types.ListKubeEventRequest,
	) ([]*models.KubeEvent, error)
	DeleteEvent(id uint) error
}
