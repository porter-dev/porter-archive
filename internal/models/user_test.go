package models_test

import (
	"testing"

	"github.com/porter-dev/porter/internal/models"
	"gorm.io/gorm"
)

func TestUserExternalize(t *testing.T) {
	// create a new user
	user := &models.User{
		Model: gorm.Model{
			ID: 1,
		},
		Email:    "testing@testing.com",
		Password: "testing123",
	}

	extUser := *user.Externalize()

	if extUser.ID != user.ID {
		t.Errorf("Field: %s\t Int: %v\t Ext: %v\n", "ID", user.ID, extUser.ID)
	}

	if extUser.Email != user.Email {
		t.Errorf("Field: %s\t Int: %v\t Ext: %v\n", "Email", user.Email, extUser.Email)
	}
}
