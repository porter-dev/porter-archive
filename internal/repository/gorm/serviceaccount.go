package gorm

import (
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

// ServiceAccountRepository uses gorm.DB for querying the database
type ServiceAccountRepository struct {
	db *gorm.DB
}

// NewServiceAccountRepository returns a ServiceAccountRepository which uses
// gorm.DB for querying the database
func NewServiceAccountRepository(db *gorm.DB) repository.ServiceAccountRepository {
	return &ServiceAccountRepository{db}
}

// CreateServiceAccountCandidate creates a new service account candidate
func (repo *ServiceAccountRepository) CreateServiceAccountCandidate(
	saCandidate *models.ServiceAccountCandidate,
) (*models.ServiceAccountCandidate, error) {
	project := &models.Project{}

	if err := repo.db.Where("id = ?", saCandidate.ProjectID).First(&project).Error; err != nil {
		return nil, err
	}

	assoc := repo.db.Model(&project).Association("ServiceAccountCandidates")

	if assoc.Error != nil {
		return nil, assoc.Error
	}

	if err := assoc.Append(saCandidate); err != nil {
		return nil, err
	}

	return saCandidate, nil
}

// ReadServiceAccountCandidate finds a service account candidate by id
func (repo *ServiceAccountRepository) ReadServiceAccountCandidate(
	id uint,
) (*models.ServiceAccountCandidate, error) {
	saCandidate := &models.ServiceAccountCandidate{}

	if err := repo.db.Preload("Actions").Where("id = ?", id).First(&saCandidate).Error; err != nil {
		return nil, err
	}

	return saCandidate, nil
}

// ListServiceAccountCandidatesByProjectID finds all service account candidates
// for a given project id
func (repo *ServiceAccountRepository) ListServiceAccountCandidatesByProjectID(
	projectID uint,
) ([]*models.ServiceAccountCandidate, error) {
	saCandidates := []*models.ServiceAccountCandidate{}

	if err := repo.db.Preload("Actions").Where("project_id = ?", projectID).Find(&saCandidates).Error; err != nil {
		return nil, err
	}

	return saCandidates, nil
}

// CreateServiceAccount creates a new servicea account
func (repo *ServiceAccountRepository) CreateServiceAccount(
	sa *models.ServiceAccount,
) (*models.ServiceAccount, error) {
	project := &models.Project{}

	if err := repo.db.Where("id = ?", sa.ProjectID).First(&project).Error; err != nil {
		return nil, err
	}

	assoc := repo.db.Model(&project).Association("ServiceAccounts")

	if assoc.Error != nil {
		return nil, assoc.Error
	}

	if err := assoc.Append(sa); err != nil {
		return nil, err
	}

	return sa, nil
}

// ReadServiceAccount finds a service account by id
func (repo *ServiceAccountRepository) ReadServiceAccount(
	id uint,
) (*models.ServiceAccount, error) {
	sa := &models.ServiceAccount{}

	// preload Clusters association
	if err := repo.db.Preload("Clusters").Where("id = ?", id).First(&sa).Error; err != nil {
		return nil, err
	}

	return sa, nil
}

// ListServiceAccountsByProjectID finds all service accounts
// for a given project id
func (repo *ServiceAccountRepository) ListServiceAccountsByProjectID(
	projectID uint,
) ([]*models.ServiceAccount, error) {
	sas := []*models.ServiceAccount{}

	if err := repo.db.Preload("Clusters").Where("project_id = ?", projectID).Find(&sas).Error; err != nil {
		return nil, err
	}

	return sas, nil
}
