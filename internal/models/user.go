package models

import (
	"github.com/porter-dev/porter/api/types"
	"gorm.io/gorm"
)

// User type that extends gorm.Model
type User struct {
	gorm.Model

	Email         string `json:"email" gorm:"unique"`
	Password      string `json:"password"`
	EmailVerified bool   `json:"email_verified"`

	// ID of oauth integration for github connection (optional)
	GithubAppIntegrationID uint

	// The github user id used for login (optional)
	GithubUserID int64
	GoogleUserID string
}

// ToUserType generates an external types.User to be shared over REST
func (u *User) ToUserType() *types.User {
	return &types.User{
		ID:            u.ID,
		Email:         u.Email,
		EmailVerified: u.EmailVerified,
	}
}
