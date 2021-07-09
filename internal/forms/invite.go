package forms

import (
	"time"

	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/oauth"
)

// CreateInvite represents the accepted values for creating an
// invite to a project
type CreateInvite struct {
	Email     string `json:"email" form:"required"`
	Kind      string `json:"kind" form:"required"`
	ProjectID uint   `form:"required"`
}

// ToInvite converts the project to a gorm project model
func (ci *CreateInvite) ToInvite() (*models.Invite, error) {
	// generate a token and an expiry time
	expiry := time.Now().Add(24 * time.Hour)

	return &models.Invite{
		Email:     ci.Email,
		Kind:      ci.Kind,
		Expiry:    &expiry,
		ProjectID: ci.ProjectID,
		Token:     oauth.CreateRandomState(),
	}, nil
}
