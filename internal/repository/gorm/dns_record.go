package gorm

import (
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

// DNSRecordRepository uses gorm.DB for querying the database
type DNSRecordRepository struct {
	db *gorm.DB
}

// NewDNSRecordRepository returns a DNSRecordRepository which uses
// gorm.DB for querying the database
func NewDNSRecordRepository(db *gorm.DB) repository.DNSRecordRepository {
	return &DNSRecordRepository{db}
}

// CreateDNSRecord creates a new helm repo
func (repo *DNSRecordRepository) CreateDNSRecord(record *models.DNSRecord) (*models.DNSRecord, error) {
	if err := repo.db.Create(record).Error; err != nil {
		return nil, err
	}

	return record, nil
}
