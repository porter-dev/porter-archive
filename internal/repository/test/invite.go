package test

import (
	"errors"

	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

// InviteRepository uses gorm.DB for querying the database
type InviteRepository struct {
	canQuery bool
	invites  []*models.Invite
}

// NewInviteRepository returns a InviteRepository which uses
// gorm.DB for querying the database
func NewInviteRepository(canQuery bool) repository.InviteRepository {
	return &InviteRepository{canQuery, []*models.Invite{}}
}

// CreateInvite creates a new invite
func (repo *InviteRepository) CreateInvite(invite *models.Invite) (*models.Invite, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot write database")
	}

	repo.invites = append(repo.invites, invite)
	invite.ID = uint(len(repo.invites))

	return invite, nil
}

// ReadInvite gets an invite specified by a unique id
func (repo *InviteRepository) ReadInvite(projectID, id uint) (*models.Invite, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot read from database")
	}

	if int(id-1) >= len(repo.invites) || repo.invites[id-1] == nil {
		return nil, gorm.ErrRecordNotFound
	}

	index := int(id - 1)
	return repo.invites[index], nil
}

// ReadInviteByToken gets an invite specified by a unique token
func (repo *InviteRepository) ReadInviteByToken(token string) (*models.Invite, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot read from database")
	}

	var res *models.Invite

	for _, invite := range repo.invites {
		if token == invite.Token {
			res = invite
		}
	}

	if res == nil {
		return nil, gorm.ErrRecordNotFound
	}

	return res, nil
}

// ListInvitesByProjectID finds all invites
// for a given project id
func (repo *InviteRepository) ListInvitesByProjectID(
	projectID uint,
) ([]*models.Invite, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot read from database")
	}

	res := make([]*models.Invite, 0)

	for _, invite := range repo.invites {
		if invite != nil && invite.ProjectID == projectID {
			res = append(res, invite)
		}
	}

	return res, nil
}

// UpdateInvite updates an invitation in the DB
func (repo *InviteRepository) UpdateInvite(
	invite *models.Invite,
) (*models.Invite, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot write database")
	}

	if int(invite.ID-1) >= len(repo.invites) || repo.invites[invite.ID-1] == nil {
		return nil, gorm.ErrRecordNotFound
	}

	index := int(invite.ID - 1)
	repo.invites[index] = invite

	return invite, nil
}

// DeleteInvite removes a registry from the db
func (repo *InviteRepository) DeleteInvite(
	invite *models.Invite,
) error {
	if !repo.canQuery {
		return errors.New("Cannot write database")
	}

	if int(invite.ID-1) >= len(repo.invites) || repo.invites[invite.ID-1] == nil {
		return gorm.ErrRecordNotFound
	}

	index := int(invite.ID - 1)
	repo.invites[index] = nil

	return nil
}
