package types

type Project struct {
	ID    uint    `json:"id"`
	Name  string  `json:"name"`
	Roles []*Role `json:"roles"`
}

type CreateProjectRequest struct {
	Name string `json:"name" form:"required"`
}

type CreateProjectResponse Project

type CreateProjectRoleRequest struct {
	Kind   string `json:"kind" form:"required"`
	UserID uint   `json:"user_id" form:"required"`
}

type ReadProjectResponse Project

type ListProjectsRequest struct{}

type ListProjectsResponse []Project

type DeleteProjectRequest struct {
	Name string `json:"name" form:"required"`
}

type DeleteProjectResponse Project

type ListProjectInfraResponse []*Infra

type GetProjectPolicyResponse []*PolicyDocument

type ListProjectRolesResponse []string

type Collaborator struct {
	ID        uint   `json:"id"`
	Kind      string `json:"kind"`
	UserID    uint   `json:"user_id"`
	Email     string `json:"email"`
	ProjectID uint   `json:"project_id"`
}

type ListCollaboratorsResponse []*Collaborator
