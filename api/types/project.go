package types

type Project struct {
	ID    uint          `json:"id"`
	Name  string        `json:"name"`
	Roles []ProjectRole `json:"roles"`
}

type ProjectRole struct {
	Kind      string `json:"kind"`
	UserID    uint   `json:"user_id"`
	ProjectID uint   `json:"project_id"`
}

type CreateProjectRequest struct {
	Name string `json:"name" form:"required"`
}

type CreateProjectResponse Project

type CreateProjectRoleRequest struct {
	Kind      string `json:"kind" form:"required"`
	UserID    uint   `json:"user_id" form:"required"`
	ProjectID uint   `json:"project_id" form:"required"`
}

type CreateProjectRoleResponse ProjectRole

type ListProjectsRequest struct{}

type ListProjectsResponse []Project

type DeleteProjectRequest struct {
	Name string `json:"name" form:"required"`
}

type DeleteProjectResponse Project
