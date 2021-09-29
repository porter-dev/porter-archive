package bind

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// Client contains an API client for a Bind DNS server wrapped
// with a lightweight API
type Client struct {
	apiKey    string
	serverURL string

	httpClient *http.Client
}

// NewClient creates a new bind API client
func NewClient(serverURL, apiKey string) *Client {
	httpClient := &http.Client{
		Timeout: time.Minute,
	}

	return &Client{apiKey, serverURL, httpClient}
}

// RecordData represents the data required to create or delete an A/CNAME record
// for the nameserver
type RecordData struct {
	Value    string `json:"value"`
	Type     string `json:"type"`
	Hostname string `json:"hostname"`
}

// CreateCNAMERecord creates a new CNAME record for the nameserver
func (c *Client) CreateCNAMERecord(value, hostname string) error {
	return c.sendRequest("POST", &RecordData{
		Value:    value,
		Type:     "CNAME",
		Hostname: hostname,
	})
}

// CreateARecord creates a new A record for the nameserver
func (c *Client) CreateARecord(value, hostname string) error {
	return c.sendRequest("POST", &RecordData{
		Value:    value,
		Type:     "A",
		Hostname: hostname,
	})
}

// DeleteARecord deletes a new A record for the nameserver
func (c *Client) DeleteARecord(value, hostname string) error {
	return c.sendRequest("DELETE", &RecordData{
		Value:    value,
		Type:     "A",
		Hostname: hostname,
	})
}

func (c *Client) sendRequest(method string, data *RecordData) error {
	reqURL, err := url.Parse(c.serverURL)

	if err != nil {
		return nil
	}

	reqURL.Path = "/dns"

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

	if res.StatusCode != http.StatusOK && res.StatusCode != http.StatusCreated {
		resBytes, err := ioutil.ReadAll(res.Body)

		if err != nil {
			return fmt.Errorf("request failed with status code %d, but could not read body (%s)\n", res.StatusCode, err.Error())
		}

		return fmt.Errorf("request failed with status code %d: %s\n", res.StatusCode, string(resBytes))
	}

	return nil
}
