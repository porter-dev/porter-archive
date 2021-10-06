// +build ee

package models

import "gorm.io/gorm"

// ProjectBilling stores a billing data per project
type ProjectBilling struct {
	*gorm.Model

	ProjectID     uint
	BillingTeamID string
}
