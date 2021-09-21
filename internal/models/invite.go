package models

import (
	"time"

	"gorm.io/gorm"

	"github.com/porter-dev/porter/api/types"
)

// Invite type that extends gorm.Model
type Invite struct {
	gorm.Model

	Token  string `gorm:"unique"`
	Expiry *time.Time
	Email  string

	// Kind is the role kind that this refers to
	Kind string

	ProjectID uint
	UserID    uint
}

// ToInviteType generates an external Invite to be shared over REST
func (i *Invite) ToInviteType() *types.Invite {
	return &types.Invite{
		ID:       i.Model.ID,
		Token:    i.Token,
		Email:    i.Email,
		Expired:  i.IsExpired(),
		Accepted: i.IsAccepted(),
		Kind:     i.Kind,
	}
}

func (i *Invite) IsExpired() bool {
	timeLeft := i.Expiry.Sub(time.Now())
	return timeLeft < 0
}

func (i *Invite) IsAccepted() bool {
	return i.UserID != 0
}
