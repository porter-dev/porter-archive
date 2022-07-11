//go:build ee
// +build ee

package billing

type CreateCustomerRequest struct {
	Email       string `json:"email" form:"required"`
	UserID      uint   `json:"user_id" form:"required"`
	ProjectID   uint   `json:"project_id" form:"required"`
	ProjectName string `json:"project_name" form:"required"`
}

type DeleteCustomerRequest struct {
	UserID    uint `json:"user_id" form:"required"`
	ProjectID uint `json:"project_id" form:"required"`
}

type APIWebhookRequest struct {
	ProjectID uint `json:"project_id" form:"required"`

	Clusters uint `json:"clusters" form:"required"`
	Users    uint `json:"users" form:"required"`
	CPU      uint `json:"cpu" form:"required"`
	Memory   uint `json:"memory" form:"required"`

	PreviewEnvironmentsEnabled string `json:"preview_environments_enabled,omitempty"`
	ManagedInfraEnabled        string `json:"managed_infra_enabled,omitempty"`
	StacksEnabled              string `json:"stacks_enabled,omitempty"`
	ManagedDatabasesEnabled    string `json:"managed_databases_enabled,omitempty"`
}

type CreateBillingCookieRequest struct {
	Email       string `json:"email" form:"required"`
	UserID      uint   `json:"user_id" form:"required"`
	ProjectID   uint   `json:"project_id" form:"required"`
	ProjectName string `json:"project_name" form:"required"`
}

type CreateBillingCookieResponse struct {
	Token   string `json:"token"`
	TokenID string `json:"token_id"`
}

type VerifyUserRequest struct {
	TokenID string `schema:"token_id" form:"required"`
	Token   string `schema:"token" form:"required"`
}
