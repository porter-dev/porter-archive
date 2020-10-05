package models

import (
	"gorm.io/gorm"
)

// User type that extends gorm.Model
type User struct {
	gorm.Model

	Email         string   `json:"email" gorm:"unique"`
	Password      string   `json:"password"`
	Contexts      []string `json:"contexts"`
	RawKubeConfig []byte   `json:"rawKubeConfig"`
}

// UserExternal represents the User type that is sent over REST
type UserExternal struct {
	ID            uint     `json:"id"`
	Email         string   `json:"email"`
	Contexts      []string `json:"contexts"`
	RawKubeConfig string   `json:"rawKubeConfig"`
}

// Externalize generates an external User to be shared over REST
func (u *User) Externalize() *UserExternal {
	contexts := u.Contexts

	if contexts == nil {
		contexts = []string{}
	}

	return &UserExternal{
		ID:            u.ID,
		Email:         u.Email,
		Contexts:      contexts,
		RawKubeConfig: string(u.RawKubeConfig),
	}
}
