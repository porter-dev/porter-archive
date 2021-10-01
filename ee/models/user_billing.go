// +build ee

package models

import "gorm.io/gorm"

// UserBilling stores a billing token per user in a project
type UserBilling struct {
	*gorm.Model

	ProjectID  uint
	UserID     uint
	TeammateID string
	Token      []byte
}
