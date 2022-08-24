package types

const URLParamProjectRoleID URLParam = "role_id"

type ProjectRole struct {
	ID     string          `json:"id" form:"required"`
	Name   string          `json:"name" form:"required"`
	Users  []uint          `json:"users"`
	Policy *PolicyDocument `json:"policy" form:"required"`
}

type CreateProjectRoleRequest struct {
	Name   string          `json:"name" form:"required"`
	Users  []uint          `json:"users"`
	Policy *PolicyDocument `json:"policy" form:"required"`
}

type UpdateProjectRoleRequest struct {
	Name   string          `json:"name"`
	Users  []uint          `json:"users"`
	Policy *PolicyDocument `json:"policy"`
}
