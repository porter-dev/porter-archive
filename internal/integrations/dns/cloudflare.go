package dns

import (
	"context"
	"fmt"

	"github.com/cloudflare/cloudflare-go"
)

// CloudflareRType strongly types cloudflare dns entry types
type CloudflareRType string

const (
	// CloudflareA declares an A record type for cloudflare
	CloudflareA CloudflareRType = "A"

	// CloudflareCNAME declares an CNME record type for cloudflare
	CloudflareCNAME = "CNAME"
)

// CloudflareTTL sets the TTL for Cloudflare DNS records
const CloudflareTTL = 300

// CloudflareClient is a struct wrapper around the cloudflare client
type CloudflareClient struct {
	zoneID string

	client *cloudflare.API
}

// NewCloudflareClient creates a new cloudflare API client
func NewCloudflareClient(apiToken string, runDomain string) (*CloudflareClient, error) {
	client, err := cloudflare.NewWithAPIToken(apiToken)
	if err != nil {
		return nil, err
	}

	zoneID, err := client.ZoneIDByName(runDomain)
	if err != nil {
		return nil, err
	}

	return &CloudflareClient{client: client, zoneID: zoneID}, nil
}

// CreateCNAMERecord creates a new CNAME record for the nameserver
//
// The method ignores record.RootDomain in favor of the zoneID derived from c.runDomain
func (c *CloudflareClient) CreateCNAMERecord(record Record) error {
	proxy := true

	cloudflareRecord := cloudflare.CreateDNSRecordParams{
		Name:    record.Name,
		Type:    string(CloudflareCNAME),
		Content: record.Value,
		TTL:     CloudflareTTL,
		Proxied: &proxy,
	}

	_, err := c.client.CreateDNSRecord(context.Background(), cloudflare.ZoneIdentifier(c.zoneID), cloudflareRecord)
	if err != nil {
		return fmt.Errorf("failed to create CNAME dns record: %w", err)
	}

	return err
}

// CreateARecord creates a new A record for the nameserver
//
// The method ignores record.RootDomain in favor of the zoneID derived from c.runDomain
func (c *CloudflareClient) CreateARecord(record Record) error {
	proxy := true

	cloudflareRecord := cloudflare.CreateDNSRecordParams{
		Name:    record.Name,
		Type:    string(CloudflareA),
		Content: record.Value,
		TTL:     CloudflareTTL,
		Proxied: &proxy,
	}

	_, err := c.client.CreateDNSRecord(context.Background(), cloudflare.ZoneIdentifier(c.zoneID), cloudflareRecord)
	if err != nil {
		return fmt.Errorf("failed to create A dns record: %w", err)
	}

	return nil
}
