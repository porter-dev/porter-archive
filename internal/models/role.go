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

func (r *Role) ToRoleType() *types.Role {
	return &types.Role{
		Kind:      r.Kind,
		UserID:    r.UserID,
		ProjectID: r.ProjectID,
	}
}
