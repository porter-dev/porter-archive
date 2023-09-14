package dns

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// PowerDNSClient contains an API client for a PowerDNS server
type PowerDNSClient struct {
	apiKey    string
	serverURL string
	runDomain string

	httpClient *http.Client
}

// NewPowerDNSClient creates a new bind API client
func NewPowerDNSClient(serverURL, apiKey, runDomain string) *PowerDNSClient {
	httpClient := &http.Client{
		Timeout: time.Minute,
	}

	return &PowerDNSClient{apiKey, serverURL, runDomain, httpClient}
}

// PowerDNSRecordData represents the data required to create or delete an A/CNAME record
// for the nameserver
type PowerDNSRecordData struct {
	RRSets []PowerDNSRR `json:"rrsets"`
}

// PowerDNSRR represents a dns resource record collection for PowerDNS
type PowerDNSRR struct {
	Name       string           `json:"name"`
	Type       string           `json:"type"`
	ChangeType string           `json:"changetype"`
	TTL        uint             `json:"ttl"`
	Records    []PowerDNSRecord `json:"records"`
}

// PowerDNSRecord represents an individual record for a given
// PowerDNS resource record
type PowerDNSRecord struct {
	Content  string `json:"content"`
	Disabled bool   `json:"disabled"`
	Name     string `json:"name"`
	Type     string `json:"type"`
	Priority uint   `json:"priority"`
}

// CreateCNAMERecord creates a new CNAME record for the nameserver
func (c *PowerDNSClient) CreateCNAMERecord(record Record) error {
	valueC := canonicalize(record.Value)
	hostnameC := canonicalize(fmt.Sprintf("%s.%s", record.Name, record.RootDomain))

	return c.sendRequest("PATCH", &PowerDNSRecordData{
		RRSets: []PowerDNSRR{{
			Name:       hostnameC,
			Type:       "CNAME",
			ChangeType: "REPLACE",
			TTL:        300,
			Records: []PowerDNSRecord{{
				Content:  valueC,
				Disabled: false,
				Name:     hostnameC,
				Type:     "CNAME",
				Priority: 0,
			}},
		}},
	})
}

// CreateARecord creates a new A record for the nameserver
func (c *PowerDNSClient) CreateARecord(record Record) error {
	hostnameC := canonicalize(fmt.Sprintf("%s.%s", record.Name, record.RootDomain))

	return c.sendRequest("PATCH", &PowerDNSRecordData{
		RRSets: []PowerDNSRR{{
			Name:       hostnameC,
			Type:       "A",
			ChangeType: "REPLACE",
			TTL:        300,
			Records: []PowerDNSRecord{{
				Content:  record.Value,
				Disabled: false,
				Name:     hostnameC,
				Type:     "A",
				Priority: 0,
			}},
		}},
	})
}

func canonicalize(value string) string {
	// if the string ends in a period, return
	if value[len(value)-1:] == "." {
		return value
	}

	return fmt.Sprintf("%s.", value)
}

func (c *PowerDNSClient) sendRequest(method string, data *PowerDNSRecordData) error {
	reqURL, err := url.Parse(c.serverURL)
	if err != nil {
		return nil
	}

	reqURL.Path = fmt.Sprintf("/api/v1/servers/localhost/zones/%s", c.runDomain)

	strData, err := json.Marshal(data)
	if err != nil {
		return err
	}

	req, err := http.NewRequest(
		method,
		reqURL.String(),
		strings.NewReader(string(strData)),
	)
	if err != nil {
		return err
	}

	req.Header.Set("Content-Type", "application/json; charset=utf-8")
	req.Header.Set("Accept", "application/json; charset=utf-8")
	req.Header.Set("X-Api-Key", c.apiKey)

	res, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}

	defer res.Body.Close()

	if res.StatusCode < http.StatusOK || res.StatusCode >= http.StatusBadRequest {
		resBytes, err := io.ReadAll(res.Body)
		if err != nil {
			return fmt.Errorf("request failed with status code %d, but could not read body (%s)\n", res.StatusCode, err.Error())
		}

		return fmt.Errorf("request failed with status code %d: %s\n", res.StatusCode, string(resBytes))
	}

	return nil
}
