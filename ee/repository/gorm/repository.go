// +build ee

package gorm

import (
	"github.com/porter-dev/porter/ee/repository"
	"gorm.io/gorm"
)

type GormRepository struct {
	userBilling repository.UserBillingRepository
	projBilling repository.ProjectBillingRepository
}

func (t *GormRepository) UserBilling() repository.UserBillingRepository {
	return t.userBilling
}

func (t *GormRepository) ProjectBilling() repository.ProjectBillingRepository {
	return t.projBilling
}

// NewEERepository returns an EERepository
func NewEERepository(db *gorm.DB, key *[32]byte) repository.EERepository {
	return &GormRepository{
		userBilling: NewUserBillingRepository(db, key),
		projBilling: NewProjectBillingRepository(db),
	}
}
