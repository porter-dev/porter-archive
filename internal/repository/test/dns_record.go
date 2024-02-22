package test

import (
	"errors"

	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
)

// DNSRecordRepository implements repository.DNSRecordRepository
type DNSRecordRepository struct {
	canQuery   bool
	dnsRecords []*models.DNSRecord
}

// NewDNSRecordRepository will return errors if canQuery is false
func NewDNSRecordRepository(canQuery bool) repository.DNSRecordRepository {
	return &DNSRecordRepository{
		canQuery,
		[]*models.DNSRecord{},
	}
}

// CreateDNSRecord creates a new repoistry
func (repo *DNSRecordRepository) CreateDNSRecord(
	record *models.DNSRecord,
) (*models.DNSRecord, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot write database")
	}

	repo.dnsRecords = append(repo.dnsRecords, record)
	record.ID = uint(len(repo.dnsRecords))

	return record, nil
}
