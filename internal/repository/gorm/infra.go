package gorm

import (
	"encoding/hex"
	"fmt"

	"github.com/porter-dev/porter/internal/encryption"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

// InfraRepository uses gorm.DB for querying the database
type InfraRepository struct {
	db  *gorm.DB
	key *[32]byte
}

// NewInfraRepository returns a InfraRepository which uses
// gorm.DB for querying the database
func NewInfraRepository(db *gorm.DB, key *[32]byte) repository.InfraRepository {
	return &InfraRepository{db, key}
}

// CreateInfra creates a new aws infra
func (repo *InfraRepository) CreateInfra(infra *models.Infra) (*models.Infra, error) {
	err := repo.EncryptInfraData(infra, repo.key)

	if err != nil {
		return nil, err
	}

	project := &models.Project{}

	if err := repo.db.Where("id = ?", infra.ProjectID).First(&project).Error; err != nil {
		return nil, err
	}

	assoc := repo.db.Model(&project).Association("Infras")

	if assoc.Error != nil {
		return nil, assoc.Error
	}

	if err := assoc.Append(infra); err != nil {
		return nil, err
	}

	err = repo.DecryptInfraData(infra, repo.key)

	if err != nil {
		return nil, err
	}

	return infra, nil
}

// ReadInfra gets a aws infra specified by a unique id
func (repo *InfraRepository) ReadInfra(projectID, infraID uint) (*models.Infra, error) {
	infra := &models.Infra{}

	if err := repo.db.Where("project_id = ? AND id = ?", projectID, infraID).First(&infra).Error; err != nil {
		return nil, err
	}

	err := repo.DecryptInfraData(infra, repo.key)

	if err != nil {
		return nil, err
	}

	return infra, nil
}

// ListInfrasByProjectID finds all aws infras
// for a given project id
func (repo *InfraRepository) ListInfrasByProjectID(
	projectID uint,
	apiVersion string,
) ([]*models.Infra, error) {

	infras := []*models.Infra{}

	query := repo.db.Where("project_id = ?", projectID).Order("updated_at desc")

	if apiVersion != "" {
		query = query.Where("api_version = ?", apiVersion)
	}

	if err := query.Find(&infras).Error; err != nil {
		return nil, err
	}

	infraIDs := make([]uint, 0)

	for _, infra := range infras {
		repo.DecryptInfraData(infra, repo.key)
		infraIDs = append(infraIDs, infra.ID)
	}

	// get the latest operation for each infra and use it to set LastApplied
	operations := make([]*models.Operation, 0)

	if err := repo.db.Where("operations.infra_id IN (?)", infraIDs).Where(`
	operations.id IN (
	  SELECT o2.id FROM (SELECT MAX(operations.id) id FROM operations WHERE operations.infra_id IN (?) GROUP BY operations.infra_id) o2
	)
  `, infraIDs).Find(&operations).Error; err != nil {
		return nil, err
	}

	// insert operations into a map
	infraIDToOperationMap := make(map[uint]models.Operation)

	for _, op := range operations {
		err := repo.DecryptOperationData(op, repo.key)

		if err == nil {
			infraIDToOperationMap[op.InfraID] = *op
		}
	}

	// look up each revision for each stack
	for _, infra := range infras {
		if _, exists := infraIDToOperationMap[infra.ID]; exists {
			infra.LastApplied = infraIDToOperationMap[infra.ID].LastApplied
		}
	}

	return infras, nil
}

// UpdateInfra modifies an existing Infra in the database
func (repo *InfraRepository) UpdateInfra(
	ai *models.Infra,
) (*models.Infra, error) {
	err := repo.EncryptInfraData(ai, repo.key)

	if err != nil {
		return nil, err
	}

	if err := repo.db.Save(ai).Error; err != nil {
		return nil, err
	}

	err = repo.DecryptInfraData(ai, repo.key)

	if err != nil {
		return nil, err
	}

	return ai, nil
}

func (repo *InfraRepository) AddOperation(infra *models.Infra, operation *models.Operation) (*models.Operation, error) {
	// don't accept operations within a 10-length unique ID
	if len(operation.UID) != hex.EncodedLen(10) {
		return nil, fmt.Errorf("operation must have unique ID with hex-decoded length 10, length is %d", len(operation.UID))
	}

	// encrypt the operation data
	err := repo.EncryptOperationData(operation, repo.key)

	if err != nil {
		return nil, err
	}

	assoc := repo.db.Model(&infra).Association("Operations")

	if assoc.Error != nil {
		return nil, assoc.Error
	}

	if err := assoc.Append(operation); err != nil {
		return nil, err
	}

	if err := repo.db.Save(operation).Error; err != nil {
		return nil, err
	}

	// decrypt the operation data before returning it
	if err := repo.DecryptOperationData(operation, repo.key); err != nil {
		return nil, err
	}

	return operation, nil
}

func (repo *InfraRepository) ListOperations(infraID uint) ([]*models.Operation, error) {
	operations := make([]*models.Operation, 0)

	if err := repo.db.Where("infra_id = ?", infraID).Order("id desc").Find(&operations).Error; err != nil {
		return nil, err
	}

	return operations, nil
}

func (repo *InfraRepository) ReadOperation(infraID uint, operationUID string) (*models.Operation, error) {
	operation := &models.Operation{}

	if err := repo.db.Order("id desc").Where("infra_id = ? AND uid = ?", infraID, operationUID).First(&operation).Error; err != nil {
		return nil, err
	}

	// decrypt the operation data before returning it
	if err := repo.DecryptOperationData(operation, repo.key); err != nil {
		return nil, err
	}

	return operation, nil
}

func (repo *InfraRepository) GetLatestOperation(infra *models.Infra) (*models.Operation, error) {
	operation := &models.Operation{}

	if err := repo.db.Order("id desc").Where("infra_id = ?", infra.ID).First(&operation).Error; err != nil {
		return nil, err
	}

	// decrypt the operation data before returning it
	if err := repo.DecryptOperationData(operation, repo.key); err != nil {
		return nil, err
	}

	return operation, nil
}

// UpdateInfra modifies an existing Infra in the database
func (repo *InfraRepository) UpdateOperation(
	operation *models.Operation,
) (*models.Operation, error) {
	err := repo.EncryptOperationData(operation, repo.key)

	if err != nil {
		return nil, err
	}

	if err := repo.db.Save(operation).Error; err != nil {
		return nil, err
	}

	err = repo.DecryptOperationData(operation, repo.key)

	if err != nil {
		return nil, err
	}

	return operation, nil
}

// EncryptInfraData will encrypt the infra data before
// writing to the DB
func (repo *InfraRepository) EncryptInfraData(
	infra *models.Infra,
	key *[32]byte,
) error {
	if len(infra.LastApplied) > 0 {
		cipherData, err := encryption.Encrypt(infra.LastApplied, key)

		if err != nil {
			return err
		}

		infra.LastApplied = cipherData
	}

	return nil
}

// DecryptInfraData will decrypt the user's infra data before
// returning it from the DB
func (repo *InfraRepository) DecryptInfraData(
	infra *models.Infra,
	key *[32]byte,
) error {
	if len(infra.LastApplied) > 0 {
		plaintext, err := encryption.Decrypt(infra.LastApplied, key)

		if err != nil {
			return err
		}

		infra.LastApplied = plaintext
	}

	return nil
}

// EncryptOperationData will encrypt the operation data before
// writing to the DB
func (repo *InfraRepository) EncryptOperationData(
	operation *models.Operation,
	key *[32]byte,
) error {
	if len(operation.LastApplied) > 0 {
		cipherData, err := encryption.Encrypt(operation.LastApplied, key)

		if err != nil {
			return err
		}

		operation.LastApplied = cipherData
	}

	return nil
}

// DecryptOperationData will decrypt the user's operation data before
// returning it from the DB
func (repo *InfraRepository) DecryptOperationData(
	operation *models.Operation,
	key *[32]byte,
) error {
	if len(operation.LastApplied) > 0 {
		plaintext, err := encryption.Decrypt(operation.LastApplied, key)

		if err != nil {
			return err
		}

		operation.LastApplied = plaintext
	}

	return nil
}
