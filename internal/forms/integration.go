package forms

import (
	ints "github.com/porter-dev/porter/internal/models/integrations"
)

// CreateGCPIntegrationForm represents the accepted values for creating a
// GCP Integration
type CreateGCPIntegrationForm struct {
	UserID       uint   `json:"user_id" form:"required"`
	ProjectID    uint   `json:"project_id" form:"required"`
	GCPKeyData   string `json:"gcp_key_data" form:"required"`
	GCPProjectID string `json:"gcp_project_id"`
	GCPRegion    string `json:"gcp_region"`
}

// ToGCPIntegration converts the project to a gorm project model
func (cgf *CreateGCPIntegrationForm) ToGCPIntegration() (*ints.GCPIntegration, error) {
	return &ints.GCPIntegration{
		UserID:       cgf.UserID,
		ProjectID:    cgf.ProjectID,
		GCPKeyData:   []byte(cgf.GCPKeyData),
		GCPProjectID: cgf.GCPProjectID,
		GCPRegion:    cgf.GCPRegion,
	}, nil
}

// CreateBasicAuthIntegrationForm represents the accepted values for creating a
// basic auth integration
type CreateBasicAuthIntegrationForm struct {
	UserID    uint   `json:"user_id" form:"required"`
	ProjectID uint   `json:"project_id" form:"required"`
	Username  string `json:"username"`
	Password  string `json:"password"`
}

// ToBasicIntegration converts the project to a gorm project model
func (cbf *CreateBasicAuthIntegrationForm) ToBasicIntegration() (*ints.BasicIntegration, error) {
	return &ints.BasicIntegration{
		UserID:    cbf.UserID,
		ProjectID: cbf.ProjectID,
		Username:  []byte(cbf.Username),
		Password:  []byte(cbf.Password),
	}, nil
}

// CreateAWSIntegrationForm represents the accepted values for creating an
// AWS Integration
type CreateAWSIntegrationForm struct {
	UserID             uint   `json:"user_id" form:"required"`
	ProjectID          uint   `json:"project_id" form:"required"`
	AWSRegion          string `json:"aws_region"`
	AWSClusterID       string `json:"aws_cluster_id"`
	AWSAccessKeyID     string `json:"aws_access_key_id"`
	AWSSecretAccessKey string `json:"aws_secret_access_key"`
}

// ToAWSIntegration converts the project to a gorm project model
func (caf *CreateAWSIntegrationForm) ToAWSIntegration() (*ints.AWSIntegration, error) {
	return &ints.AWSIntegration{
		UserID:             caf.UserID,
		ProjectID:          caf.ProjectID,
		AWSRegion:          caf.AWSRegion,
		AWSClusterID:       []byte(caf.AWSClusterID),
		AWSAccessKeyID:     []byte(caf.AWSAccessKeyID),
		AWSSecretAccessKey: []byte(caf.AWSSecretAccessKey),
	}, nil
}

// OverwriteAWSIntegrationForm represents the accepted values for overwriting an
// AWS Integration
type OverwriteAWSIntegrationForm struct {
	UserID             uint   `json:"user_id" form:"required"`
	ProjectID          uint   `json:"project_id" form:"required"`
	AWSAccessKeyID     string `json:"aws_access_key_id"`
	AWSSecretAccessKey string `json:"aws_secret_access_key"`
}
