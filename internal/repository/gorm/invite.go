package gorm

import (
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

// InviteRepository uses gorm.DB for querying the database
type InviteRepository struct {
	db *gorm.DB
}

// NewInviteRepository returns a InviteRepository which uses
// gorm.DB for querying the database
func NewInviteRepository(db *gorm.DB) repository.InviteRepository {
	return &InviteRepository{db}
}

// CreateInvite creates a new invite
func (repo *InviteRepository) CreateInvite(invite *models.Invite) (*models.Invite, error) {
	project := &models.Project{}

	if err := repo.db.Where("id = ?", invite.ProjectID).First(&project).Error; err != nil {
		return nil, err
	}

	assoc := repo.db.Model(&project).Association("Invites")

	if assoc.Error != nil {
		return nil, assoc.Error
	}

	if err := assoc.Append(invite); err != nil {
		return nil, err
	}

	return invite, nil
}

// ReadInvite gets an invite specified by a unique id
func (repo *InviteRepository) ReadInvite(projectID, inviteID uint) (*models.Invite, error) {
	invite := &models.Invite{}

	if err := repo.db.Where("project_id = ? AND id = ?", projectID, inviteID).First(&invite).Error; err != nil {
		return nil, err
	}

	return invite, nil
}

// ReadInviteByToken gets an invite specified by a unique token
func (repo *InviteRepository) ReadInviteByToken(token string) (*models.Invite, error) {
	invite := &models.Invite{}

	if err := repo.db.Where("token = ?", token).First(&invite).Error; err != nil {
		return nil, err
	}

	return invite, nil
}

// ListInvitesByProjectID finds all invites
// for a given project id
func (repo *InviteRepository) ListInvitesByProjectID(
	projectID uint,
) ([]*models.Invite, error) {
	invites := []*models.Invite{}

	if err := repo.db.Where("project_id = ?", projectID).Find(&invites).Error; err != nil {
		return nil, err
	}

	return invites, nil
}

// UpdateInvite updates an invitation in the DB
func (repo *InviteRepository) UpdateInvite(
	invite *models.Invite,
) (*models.Invite, error) {
	if err := repo.db.Save(invite).Error; err != nil {
		return nil, err
	}

	return invite, nil
}

// DeleteInvite removes a registry from the db
func (repo *InviteRepository) DeleteInvite(
	invite *models.Invite,
) error {
	// clear TokenCache association
	if err := repo.db.Where("id = ?", invite.ID).Delete(&models.Invite{}).Error; err != nil {
		return err
	}

	return nil
}
