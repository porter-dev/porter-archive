package models

import (
	"fmt"

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

// DNSRecordExternal represents the DNSRecord type that is sent over REST
type DNSRecordExternal struct {
	ExternalURL string `json:"external_url"`

	Endpoint string `json:"endpoint"`
	Hostname string `json:"hostname"`

	ClusterID uint `json:"cluster_id"`
}

// Externalize generates an external Project to be shared over REST
func (p *DNSRecord) Externalize() *DNSRecordExternal {
	return &DNSRecordExternal{
		ExternalURL: fmt.Sprintf("%s.%s", p.SubdomainPrefix, p.RootDomain),
		Endpoint:    p.Endpoint,
		Hostname:    p.Hostname,
		ClusterID:   p.ClusterID,
	}
}
