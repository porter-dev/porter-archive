package models

import (
	"github.com/porter-dev/porter/api/types"
	"gorm.io/gorm"
)

// The roles available for a project
const (
	RoleAdmin     string = "admin"
	RoleDeveloper string = "developer"
	RoleViewer    string = "viewer"
)

// Role type that extends gorm.Model
type Role struct {
	gorm.Model
	types.Role
}

// RoleExternal represents the Role type that is sent over REST
type RoleExternal struct {
	types.Role
	ID uint `json:"id"`
}

// Externalize generates an external Role to be shared over REST
func (r *Role) Externalize() *RoleExternal {
	return &RoleExternal{
		ID: r.ID,
		Role: types.Role{
			Kind:      r.Kind,
			UserID:    r.UserID,
			ProjectID: r.ProjectID,
		},
	}
}

func (r *Role) ToRoleType() *types.Role {
	return &types.Role{
		Kind:      r.Kind,
		UserID:    r.UserID,
		ProjectID: r.ProjectID,
	}
}
