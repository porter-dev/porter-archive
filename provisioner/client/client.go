package client

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/gorilla/schema"
	"github.com/porter-dev/porter/api/types"
)

type Client struct {
	BaseURL    string
	HTTPClient *http.Client
}

// TODO: add token-based mechanism to client and server
func NewClient(baseURL string) *Client {
	client := &Client{
		BaseURL: baseURL,
		HTTPClient: &http.Client{
			Timeout: time.Minute,
		},
	}

	return client
}

func (c *Client) getRequest(relPath string, data interface{}, response interface{}) error {
	vals := make(map[string][]string)
	err := schema.NewEncoder().Encode(data, vals)

	urlVals := url.Values(vals)
	encodedURLVals := urlVals.Encode()
	var req *http.Request

	if encodedURLVals != "" {
		req, err = http.NewRequest(
			"GET",
			fmt.Sprintf("%s%s?%s", c.BaseURL, relPath, encodedURLVals),
			nil,
		)
	} else {
		req, err = http.NewRequest(
			"GET",
			fmt.Sprintf("%s%s", c.BaseURL, relPath),
			nil,
		)
	}

	if err != nil {
		return err
	}

	if httpErr, err := c.sendRequest(req, response); httpErr != nil || err != nil {
		if httpErr != nil {
			return fmt.Errorf("%v", httpErr.Error)
		}

		return err
	}

	return nil
}

type postRequestOpts struct {
	retryCount uint
}

func (c *Client) postRequest(relPath string, data interface{}, response interface{}, opts ...postRequestOpts) error {
	var retryCount uint = 1

	if len(opts) > 0 {
		for _, opt := range opts {
			retryCount = opt.retryCount
		}
	}

	var httpErr *types.ExternalError
	var err error

	for i := 0; i < int(retryCount); i++ {
		strData, err := json.Marshal(data)

		if err != nil {
			return nil
		}

		req, err := http.NewRequest(
			"POST",
			fmt.Sprintf("%s%s", c.BaseURL, relPath),
			strings.NewReader(string(strData)),
		)

		if err != nil {
			return err
		}

		httpErr, err = c.sendRequest(req, response)

		if httpErr == nil && err == nil {
			return nil
		}

		if i != int(retryCount)-1 {
			if httpErr != nil {
				fmt.Printf("Error: %s (status code %d), retrying request...\n", httpErr.Error, httpErr.Code)
			} else {
				fmt.Printf("Error: %v, retrying request...\n", err)
			}
		}
	}

	if httpErr != nil {
		return fmt.Errorf("%v", httpErr.Error)
	}

	return err
}

func (c *Client) deleteRequest(relPath string, data interface{}, response interface{}) error {
	strData, err := json.Marshal(data)

	if err != nil {
		return nil
	}

	req, err := http.NewRequest(
		"DELETE",
		fmt.Sprintf("%s%s", c.BaseURL, relPath),
		strings.NewReader(string(strData)),
	)

	if err != nil {
		return err
	}

	if httpErr, err := c.sendRequest(req, response); httpErr != nil || err != nil {
		if httpErr != nil {
			return fmt.Errorf("%v", httpErr.Error)
		}

		return err
	}

	return nil
}

func (c *Client) sendRequest(req *http.Request, v interface{}) (*types.ExternalError, error) {
	req.Header.Set("Content-Type", "application/json; charset=utf-8")
	req.Header.Set("Accept", "application/json; charset=utf-8")

	// if c.Token != "" {
	// 	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.Token))
	// }

	res, err := c.HTTPClient.Do(req)

	if err != nil {
		return nil, err
	}

	defer res.Body.Close()

	if res.StatusCode < http.StatusOK || res.StatusCode >= http.StatusBadRequest {
		var errRes types.ExternalError
		if err = json.NewDecoder(res.Body).Decode(&errRes); err == nil {
			return &errRes, nil
		}

		return nil, fmt.Errorf("unknown error, status code: %d", res.StatusCode)
	}

	if v != nil {
		if err = json.NewDecoder(res.Body).Decode(v); err != nil {
			return nil, err
		}
	}

	return nil, nil
}
