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
		Clusters: []models.ClusterConfig{
			models.ClusterConfig{
				Name:   "test",
				Server: "localhost",
				User:   "test",
				UserID: 1,
			},
		},
		RawKubeConfig: []byte{},
	}

	extUser := *user.Externalize()

	if extUser.ID != user.ID {
		t.Errorf("Field: %s\t Int: %v\t Ext: %v\n", "ID", user.ID, extUser.ID)
	}

	if extUser.Email != user.Email {
		t.Errorf("Field: %s\t Int: %v\t Ext: %v\n", "Email", user.Email, extUser.Email)
	}

	if len(extUser.Clusters) != 1 {
		t.Errorf("Field: %s\t Int: %v\t Ext: %v\n", "Length Clusters", len(extUser.Clusters), 1)
	}

	if len(extUser.RawKubeConfig) != 0 {
		t.Errorf("Field: %s\t Int: %v\t Ext: %v\n", "Length RawKubeConfig", len(extUser.RawKubeConfig), 0)
	}
}
