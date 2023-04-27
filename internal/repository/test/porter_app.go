package test

import (
	"errors"
	"strings"

	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
)

type PorterAppRepository struct {
	canQuery       bool
	failingMethods string
}

func NewPorterAppRepository(canQuery bool, failingMethods ...string) repository.PorterAppRepository {
	return &PorterAppRepository{canQuery, strings.Join(failingMethods, ",")}

}

func (repo *PorterAppRepository) CreatePorterApp(app *models.PorterApp) (*models.PorterApp, error) {
	return nil, errors.New("cannot write database")
}

func (repo *PorterAppRepository) ReadPorterApp(clusterID uint, name string) (*models.PorterApp, error) {
	return nil, errors.New("cannot write database")
}

func (repo *PorterAppRepository) UpdatePorterApp(app *models.PorterApp) (*models.PorterApp, error) {
	return nil, errors.New("cannot write database")
}
