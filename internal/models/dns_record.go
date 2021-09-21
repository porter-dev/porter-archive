package models

import (
	"fmt"

	"github.com/porter-dev/porter/api/types"
	"gorm.io/gorm"
)

// DNSRecord type that extends gorm.Model
type DNSRecord struct {
	gorm.Model

	SubdomainPrefix string `json:"subdomain_prefix" gorm:"unique"`
	RootDomain      string `json:"root_domain"`

	Endpoint string `json:"endpoint"`
	Hostname string `json:"hostname"`

	ClusterID uint `json:"cluster_id"`
}

func (p *DNSRecord) ToDNSRecordType() *types.DNSRecord {
	return &types.DNSRecord{
		ExternalURL: fmt.Sprintf("%s.%s", p.SubdomainPrefix, p.RootDomain),
		Endpoint:    p.Endpoint,
		Hostname:    p.Hostname,
		ClusterID:   p.ClusterID,
	}
}
