package models

import (
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

	Kind      string `json:"kind"`
	UserID    uint   `json:"user_id"`
	ProjectID uint   `json:"project_id"`
}

// RoleExternal represents the Role type that is sent over REST
type RoleExternal struct {
	ID        uint   `json:"id"`
	Kind      string `json:"kind"`
	UserID    uint   `json:"user_id"`
	ProjectID uint   `json:"project_id"`
}

// Externalize generates an external Role to be shared over REST
func (r *Role) Externalize() *RoleExternal {
	return &RoleExternal{
		ID:        r.ID,
		Kind:      r.Kind,
		UserID:    r.UserID,
		ProjectID: r.ProjectID,
	}
}
