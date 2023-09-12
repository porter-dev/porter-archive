package dns

import "github.com/porter-dev/porter/internal/integrations/powerdns"

type Client struct {
	Client *powerdns.Client
}

func (c Client) CreateARecord(value, hostname string) error {
	return c.Client.CreateARecord(value, hostname)
}

func (c Client) CreateCNAMERecord(value, hostname string) error {
	return c.Client.CreateCNAMERecord(value, hostname)
}
