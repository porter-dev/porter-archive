package cloudflare

import (
	"context"
	"fmt"

	"github.com/cloudflare/cloudflare-go"
	"github.com/porter-dev/porter/internal/integrations/dns"
)

// RecordType strongly types cloudflare dns entry types
type RecordType string

const (
	// RecordType_A declares an A record type for cloudflare
	RecordType_A RecordType = "A"

	// RecordType_CNAME declares an CNME record type for cloudflare
	RecordType_CNAME = "CNAME"
)

// TTL sets the TTL for Cloudflare DNS records
const TTL = 300

// Client is a struct wrapper around the cloudflare client
type Client struct {
	zoneID string

	client *cloudflare.API
}

// NewClient creates a new cloudflare API client
func NewClient(apiToken string, runDomain string) (Client, error) {
	client, err := cloudflare.NewWithAPIToken(apiToken)
	if err != nil {
		return Client{}, err
	}

	zoneID, err := client.ZoneIDByName(runDomain)
	if err != nil {
		return Client{}, err
	}

	return Client{client: client, zoneID: zoneID}, nil
}

// CreateCNAMERecord creates a new CNAME record for the nameserver
//
// The method ignores record.RootDomain in favor of the zoneID derived from c.runDomain
func (c Client) CreateCNAMERecord(record dns.Record) error {
	proxy := false

	cloudflareRecord := cloudflare.CreateDNSRecordParams{
		Name:    record.Name,
		Type:    string(RecordType_CNAME),
		Content: record.Value,
		TTL:     TTL,
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
func (c Client) CreateARecord(record dns.Record) error {
	proxy := false

	cloudflareRecord := cloudflare.CreateDNSRecordParams{
		Name:    record.Name,
		Type:    string(RecordType_A),
		Content: record.Value,
		TTL:     TTL,
		Proxied: &proxy,
	}

	_, err := c.client.CreateDNSRecord(context.Background(), cloudflare.ZoneIdentifier(c.zoneID), cloudflareRecord)
	if err != nil {
		return fmt.Errorf("failed to create A dns record: %w", err)
	}

	return nil
}
