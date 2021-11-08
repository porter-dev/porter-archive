package types

type AddProjectBillingRequest struct {
	ProjectID uint `json:"project_id" form:"required"`

	// Monthly price, in cents
	Price uint `json:"price" form:"required"`

	Users    uint `json:"users"`
	Clusters uint `json:"clusters"`
	CPU      uint `json:"cpu"`
	Memory   uint `json:"memory"`

	ExistingPlanName string `json:"existing_plan_name"`
}
