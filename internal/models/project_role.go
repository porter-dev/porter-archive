package models

import (
	"fmt"

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

func (role *ProjectRole) IsDefaultRole() bool {
	return role.UniqueID == fmt.Sprintf("%d-%s", role.ProjectID, types.RoleAdmin) ||
		role.UniqueID == fmt.Sprintf("%d-%s", role.ProjectID, types.RoleDeveloper) ||
		role.UniqueID == fmt.Sprintf("%d-%s", role.ProjectID, types.RoleViewer)
}

func (role *ProjectRole) GetUserIDs() []uint {
	var ids []uint

	for _, user := range role.Users {
		ids = append(ids, user.ID)
	}

	return ids
}
