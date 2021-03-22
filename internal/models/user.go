package models

import (
	"gorm.io/gorm"
)

// User type that extends gorm.Model
type User struct {
	gorm.Model

	Email         string `json:"email" gorm:"unique"`
	Password      string `json:"password"`
	EmailVerified bool   `json:"email_verified"`

	// The github user id used for login (optional)
	GithubUserID int64
}

// UserExternal represents the User type that is sent over REST
type UserExternal struct {
	ID            uint   `json:"id"`
	Email         string `json:"email"`
	EmailVerified bool   `json:"email_verified"`
}

// Externalize generates an external User to be shared over REST
func (u *User) Externalize() *UserExternal {
	return &UserExternal{
		ID:            u.ID,
		Email:         u.Email,
		EmailVerified: u.EmailVerified,
	}
}
