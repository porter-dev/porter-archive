package dns

import "github.com/porter-dev/porter/internal/integrations/powerdns"

// Client wraps the underlying powerdns client
// providing a stable api around interacting with DNS
type Client struct {
	Client *powerdns.Client
}

// CreateARecord creates a new A record
func (c Client) CreateARecord(value, hostname string) error {
	return c.Client.CreateARecord(value, hostname)
}

// CreateCNAMERecord creates a new CNAME record
func (c Client) CreateCNAMERecord(value, hostname string) error {
	return c.Client.CreateCNAMERecord(value, hostname)
}
