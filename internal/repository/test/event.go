package test

import (
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
)

type BuildEventRepository struct{}

func NewBuildEventRepository(canQuery bool) repository.BuildEventRepository {
	return &BuildEventRepository{}
}

func (n *BuildEventRepository) CreateEventContainer(am *models.EventContainer) (*models.EventContainer, error) {
	panic("not implemented") // TODO: Implement
}

func (n *BuildEventRepository) CreateSubEvent(am *models.SubEvent) (*models.SubEvent, error) {
	panic("not implemented") // TODO: Implement
}

func (n *BuildEventRepository) ReadEventsByContainerID(id uint) ([]*models.SubEvent, error) {
	panic("not implemented") // TODO: Implement
}

func (n *BuildEventRepository) ReadEventContainer(id uint) (*models.EventContainer, error) {
	panic("not implemented") // TODO: Implement
}

func (n *BuildEventRepository) ReadSubEvent(id uint) (*models.SubEvent, error) {
	panic("not implemented") // TODO: Implement
}

func (n *BuildEventRepository) AppendEvent(container *models.EventContainer, event *models.SubEvent) error {
	panic("not implemented") // TODO: Implement
}

type KubeEventRepository struct{}

func NewKubeEventRepository(canQuery bool) repository.KubeEventRepository {
	return &KubeEventRepository{}
}

func (n *KubeEventRepository) CreateEvent(event *models.KubeEvent) (*models.KubeEvent, error) {
	panic("not implemented") // TODO: Implement
}

func (n *KubeEventRepository) ReadEvent(id uint, projID uint, clusterID uint) (*models.KubeEvent, error) {
	panic("not implemented") // TODO: Implement
}

func (n *KubeEventRepository) ReadEventByGroup(
	projID uint,
	clusterID uint,
	opts *types.GroupOptions,
) (*models.KubeEvent, error) {
	panic("not implemented") // TODO: Implement
}

func (n *KubeEventRepository) ListEventsByProjectID(
	projectID uint,
	clusterID uint,
	opts *types.ListKubeEventRequest,
) ([]*models.KubeEvent, error) {
	panic("not implemented") // TODO: Implement
}

func (n *KubeEventRepository) AppendSubEvent(event *models.KubeEvent, subEvent *models.KubeSubEvent) error {
	panic("not implemented") // TODO: Implement
}

func (n *KubeEventRepository) DeleteEvent(id uint) error {
	panic("not implemented") // TODO: Implement
}
