package httpbackend

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"time"
)

type Client struct {
	backendURL string

	httpClient *http.Client
}

func NewClient(backendURL string) *Client {
	httpClient := &http.Client{
		Timeout: time.Minute,
	}

	return &Client{backendURL, httpClient}
}

func (c *Client) GetCurrentState(name string) (*TFState, error) {
	resp := &TFState{}

	err := c.getRequest(fmt.Sprintf("%s/%s/tfstate", c.backendURL, name), resp)

	return resp, err
}

type GetDesiredStateResp struct {
	Data *DesiredTFState `json:"data"`
}

func (c *Client) GetDesiredState(name string) (*DesiredTFState, error) {
	resp := &GetDesiredStateResp{}

	err := c.getRequest(fmt.Sprintf("%s/%s/state", c.backendURL, name), resp)

	if err != nil {
		return nil, err
	}

	return resp.Data, nil
}

var ErrNotFound = fmt.Errorf("Not found")

func (c *Client) getRequest(path string, dst interface{}) error {
	req, err := http.NewRequest(
		"GET",
		path,
		nil,
	)

	if err != nil {
		return err
	}

	req.Header.Set("Content-Type", "application/json; charset=utf-8")
	req.Header.Set("Accept", "application/json; charset=utf-8")

	res, err := c.httpClient.Do(req)

	if err != nil {
		return err
	}

	defer res.Body.Close()

	if res.StatusCode < http.StatusOK || res.StatusCode >= http.StatusBadRequest {
		resBytes, err := ioutil.ReadAll(res.Body)

		if err != nil {
			return fmt.Errorf("request failed with status code %d, but could not read body (%s)\n", res.StatusCode, err.Error())
		}

		if res.StatusCode == http.StatusNotFound {
			return ErrNotFound
		}

		return fmt.Errorf("request failed with status code %d: %s\n", res.StatusCode, string(resBytes))
	}

	if dst != nil {
		return json.NewDecoder(res.Body).Decode(dst)
	}

	return nil
}
