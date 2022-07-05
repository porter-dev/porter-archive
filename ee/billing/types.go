//go:build ee
// +build ee

package billing

type CreateCustomerRequest struct {
	Email     string `json:"email" form:"required"`
	UserID    uint   `json:"user_id" form:"required"`
	ProjectID uint   `json:"project_id" form:"required"`
}

type DeleteCustomerRequest struct {
	UserID    uint `json:"user_id" form:"required"`
	ProjectID uint `json:"project_id" form:"required"`
}
