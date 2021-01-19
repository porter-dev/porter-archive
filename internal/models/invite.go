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

	ProjectID uint
	UserID    uint
}

// InviteExternal represents the Invite type that is sent over REST
type InviteExternal struct {
	Token    string `json:"token"`
	Expired  bool   `json:"expired"`
	Email    string `json:"email"`
	Accepted bool   `json:"accepted"`
}

// Externalize generates an external Invite to be shared over REST
func (i *Invite) Externalize() *InviteExternal {
	return &InviteExternal{
		Token:    i.Token,
		Email:    i.Email,
		Expired:  i.IsExpired(),
		Accepted: i.IsAccepted(),
	}
}

func (i *Invite) IsExpired() bool {
	timeLeft := i.Expiry.Sub(time.Now())
	return timeLeft < 0
}

func (i *Invite) IsAccepted() bool {
	return i.UserID != 0
}
