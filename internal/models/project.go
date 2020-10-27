package models

import (
	"gorm.io/gorm"
)

// Project type that extends gorm.Model
type Project struct {
	gorm.Model

	Name  string `json:"name"`
	Roles []Role `json:"roles"`
}

// ProjectExternal represents the Project type that is sent over REST
type ProjectExternal struct {
	ID    uint           `json:"id"`
	Name  string         `json:"name"`
	Roles []RoleExternal `json:"roles"`
}

// Externalize generates an external Project to be shared over REST
func (p *Project) Externalize() *ProjectExternal {
	roles := make([]RoleExternal, 0)

	for _, role := range p.Roles {
		roles = append(roles, *role.Externalize())
	}

	return &ProjectExternal{
		ID:    p.ID,
		Name:  p.Name,
		Roles: roles,
	}
}
