package models_test

import (
	"testing"

	"github.com/jinzhu/gorm"
	"github.com/porter-dev/porter/internal/models"
)

func TestClusterConfigExternalize(t *testing.T) {
	cc := &models.ClusterConfig{
		Model: gorm.Model{
			ID: 1,
		},
		Name:   "test",
		Server: "localhost",
		User:   "test",
		UserID: 1,
	}

	extCC := *cc.Externalize()

	if extCC.Name != cc.Name {
		t.Errorf("Field: %s\t Int: %v\t Ext: %v\n", "Name", extCC.Name, cc.Name)
	}

	if extCC.Server != cc.Server {
		t.Errorf("Field: %s\t Int: %v\t Ext: %v\n", "Server", extCC.Server, cc.Server)
	}

	if extCC.User != cc.User {
		t.Errorf("Field: %s\t Int: %v\t Ext: %v\n", "User", extCC.User, cc.User)
	}

	if extCC.Context != cc.Context {
		t.Errorf("Field: %s\t Int: %v\t Ext: %v\n", "Context", extCC.Context, cc.Context)
	}
}
