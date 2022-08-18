package models

import (
	"github.com/porter-dev/porter/api/types"
	"gorm.io/gorm"
)

type ProjectRole struct {
	gorm.Model

	UniqueID string `gorm:"unique"`

	ProjectID uint
	PolicyUID string

	Name string

	Users []User `gorm:"many2many:user_roles"`
}

func (role *ProjectRole) ToProjectRoleType(policy *types.PolicyDocument) *types.ProjectRole {
	res := &types.ProjectRole{
		ID:     role.UniqueID,
		Name:   role.Name,
		Policy: policy,
	}

	for _, user := range role.Users {
		res.Users = append(res.Users, user.ID)
	}

	return res
}
