// +build ee

package repository

import "github.com/porter-dev/porter/ee/models"

type UserBillingRepository interface {
	CreateUserBilling(userBilling *models.UserBilling) (*models.UserBilling, error)
	ReadUserBilling(projectID, userID uint) (*models.UserBilling, error)
	UpdateUserBilling(userBilling *models.UserBilling) (*models.UserBilling, error)
}
