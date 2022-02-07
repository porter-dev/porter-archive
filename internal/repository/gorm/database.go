package gorm

import (
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

type DatabaseRepository struct {
	db  *gorm.DB
	key *[32]byte
}

func NewDatabaseRepository(db *gorm.DB, key *[32]byte) repository.DatabaseRepository {
	return &DatabaseRepository{db, key}
}

func (repo *DatabaseRepository) CreateDatabase(database *models.Database) (*models.Database, error) {
	project := &models.Project{}
	if err := repo.db.Debug().First(project, database.ProjectID).Error; err != nil {
		return nil, err
	}

	assoc := repo.db.Debug().Model(project).Association("Databases")
	if assoc.Error != nil {
		return nil, assoc.Error
	}

	if err := assoc.Append(database); err != nil {
		return nil, err
	}

	return database, nil
}

func (repo *DatabaseRepository) ReadDatabase(projectID, clusterID, databaseID uint) (*models.Database, error) {
	database := &models.Database{}

	if err := repo.db.Where("project_id = ? AND cluster_id = ? AND id = ?", projectID, clusterID, databaseID).First(&database).Error; err != nil {
		return nil, err
	}

	return database, nil
}

func (repo *DatabaseRepository) ReadDatabaseByInfraID(projectID, infraID uint) (*models.Database, error) {
	database := &models.Database{}

	if err := repo.db.Where("project_id = ? AND infra_id = ?", projectID, infraID).First(&database).Error; err != nil {
		return nil, err
	}

	return database, nil
}

func (repo *DatabaseRepository) UpdateDatabase(database *models.Database) (*models.Database, error) {
	if err := repo.db.Save(database).Error; err != nil {
		return nil, err
	}

	return database, nil
}

func (repo *DatabaseRepository) DeleteDatabase(projectID, clusterID, databaseID uint) error {
	if err := repo.db.Where("project_id = ? AND cluster_id = ? AND id = ?", projectID, clusterID, databaseID).Delete(&models.Database{}).Error; err != nil {
		return err
	}

	return nil
}

func (repo *DatabaseRepository) ListDatabases(projectID, clusterID uint) ([]*models.Database, error) {
	databases := []*models.Database{}
	if err := repo.db.Where("project_id = ? AND cluster_id = ?", projectID, clusterID).Find(&databases).Error; err != nil {
		return nil, err
	}

	return databases, nil
}
