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

// CNAMEData represents the data required to create or delete a CNAME record
// for the nameserver
type CNAMEData struct {
	Host     string `json:"host"`
	Hostname string `json:"hostname"`
}

// CreateCNAMERecord creates a new CNAME record for the nameserver
func (c *Client) CreateCNAMERecord(data *CNAMEData) error {
	return c.sendRequest("POST", data)
}

// DeleteCNAMERecord deletes a new CNAME record for the nameserver
func (c *Client) DeleteCNAMERecord(data *CNAMEData) error {
	return c.sendRequest("DELETE", data)
}

func (c *Client) sendRequest(method string, data *CNAMEData) error {
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

	if res.StatusCode != http.StatusOK {
		resBytes, err := ioutil.ReadAll(res.Body)

		if err != nil {
			return fmt.Errorf("request failed with status code %d, but could not read body (%s)\n", res.StatusCode, err.Error())
		}

		return fmt.Errorf("request failed with status code %d: %s\n", res.StatusCode, string(resBytes))
	}

	return nil
}
