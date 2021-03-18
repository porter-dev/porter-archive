package forms

// CreateDomainForm represents the accepted values for creating a DNS record
type CreateDomainForm struct {
	*K8sForm

	ReleaseName string `json:"release_name" form:"required"`
}
