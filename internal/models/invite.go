package models

import (
	"time"

	"gorm.io/gorm"
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

// InviteExternal represents the Invite type that is sent over REST
type InviteExternal struct {
	ID       uint   `json:"id"`
	Token    string `json:"token"`
	Expired  bool   `json:"expired"`
	Email    string `json:"email"`
	Accepted bool   `json:"accepted"`
	Kind     string `json:"kind"`
}

// Externalize generates an external Invite to be shared over REST
func (i *Invite) Externalize() *InviteExternal {
	return &InviteExternal{
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
