// +build ee

package repository

import "github.com/porter-dev/porter/ee/models"

type ProjectBillingRepository interface {
	CreateProjectBilling(userBilling *models.ProjectBilling) (*models.ProjectBilling, error)
	ReadProjectBillingByProjectID(projectID uint) (*models.ProjectBilling, error)
	ReadProjectBillingByTeamID(teamID string) (*models.ProjectBilling, error)
}
