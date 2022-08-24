package models

import (
	"strings"
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

	// Kind is the role kind that this refers to (legacy field)
	Kind string

	ProjectID uint
	UserID    uint
	Roles     []byte // stored as a byte-array of comma-separated strings of role UIDs
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
		Roles:    strings.Split(string(i.Roles), ","),
	}
}

func (i *Invite) IsExpired() bool {
	return time.Until(*i.Expiry) < 0
}

func (i *Invite) IsAccepted() bool {
	return i.UserID != 0
}
