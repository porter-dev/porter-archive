package repository

import (
	"github.com/porter-dev/porter/internal/models"
)

// InviteRepository represents the set of queries on the Invite model
type InviteRepository interface {
	CreateInvite(invite *models.Invite) (*models.Invite, error)
	ReadInvite(projectID, inviteID uint) (*models.Invite, error)
	ReadInviteByToken(token string) (*models.Invite, error)
	ListInvitesByProjectID(projectID uint) ([]*models.Invite, error)
	UpdateInvite(invite *models.Invite) (*models.Invite, error)
	DeleteInvite(invite *models.Invite) error
}
