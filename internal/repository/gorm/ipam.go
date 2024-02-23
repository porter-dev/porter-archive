package gorm

import (
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

// Ipam uses gorm.DB for querying the database
type Ipam struct {
	db *gorm.DB
}

// NewIpamRepository creates an IPAM connection
func NewIpamRepository(db *gorm.DB) repository.IpamRepository {
	return &Ipam{db}
}
