package client

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/gorilla/schema"
	"github.com/porter-dev/porter/api/types"
)

// Client represents the client for the Porter API
type Client struct {
	BaseURL        string
	HTTPClient     *http.Client
	Cookie         *http.Cookie
	CookieFilePath string
	Token          string

	// cfToken is a cloudflare token for accessing the API
	cfToken string
}

// NewClientInput contains all information required to create a new API Client
type NewClientInput struct {
	// BaseURL is the url for the API. This usually ends with /api, and should not end with a /
	BaseURL string

	// CookieFileName allows you to authenticate with a cookie file, if one is present in the porter directory.
	// If both CookieFileName and BearerToken are specified, BearerToken will be preferred
	CookieFileName string

	// BearerToken uses a JWT to authenticate with the Porter API. If both BearerToken and CookieFileName are specified, BearerToken will be used
	BearerToken string

	// CloudflareToken allows for authenticating with a Porter API behind Cloudflare Zero Trust. If not specified, we will check PORTER_CF_ACCESS_TOKEN for a token.
	// If one is found, it will be added to all API calls.
	CloudflareToken string
}

// NewClientWithConfig creates a new API client with the provided config
func NewClientWithConfig(ctx context.Context, input NewClientInput) (Client, error) {
	client := Client{
		BaseURL: input.BaseURL,
		HTTPClient: &http.Client{
			Timeout: time.Minute,
		},
	}
	if cfToken := os.Getenv("PORTER_CF_ACCESS_TOKEN"); cfToken != "" {
		client.cfToken = cfToken
	}

	if input.BearerToken != "" {
		client.Token = input.BearerToken
		return client, nil
	}

	if input.CookieFileName != "" {
		client.CookieFilePath = input.CookieFileName
		cookie, err := client.getCookie()
		if err != nil {
			return client, fmt.Errorf("error getting cooking from path: %w", err)
		}
		if cookie == nil {
			return client, errors.New("no cookie found at location")
		}
		return client, nil
	}
	return client, ErrNoAuthCredential
}

// ErrNoAuthCredential returns an error when no auth credentials have been provided such as cookies or tokens
var ErrNoAuthCredential = errors.New("unable to create an API session with cookie nor token")

// getRequestConfig defines configuration for a GET request
type getRequestConfig struct {
	retryCount uint
}

// withRetryCount is a convenience function for setting the retry count
func withRetryCount(retryCount uint) func(*getRequestConfig) {
	return func(o *getRequestConfig) {
		o.retryCount = retryCount
	}
}

// getRequest makes a GET request to the API
func (c *Client) getRequest(relPath string, data interface{}, response interface{}, opts ...func(*getRequestConfig)) error {
	vals := make(map[string][]string)
	_ = schema.NewEncoder().Encode(data, vals)
	var err error

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

	config := &getRequestConfig{
		retryCount: 1,
	}

	for _, opt := range opts {
		opt(config)
	}

	var httpErr *types.ExternalError
	for i := 0; i < int(config.retryCount); i++ {
		httpErr, err = c.sendRequest(req, response, true)

		if httpErr == nil && err == nil {
			return nil
		}

		if i != int(config.retryCount)-1 {
			if httpErr != nil {
				fmt.Fprintf(os.Stderr, "Error: %s (status code %d), retrying request...\n", httpErr.Error, httpErr.Code)
			} else {
				fmt.Fprintf(os.Stderr, "Error: %v, retrying request...\n", err)
			}
		}
	}

	if httpErr != nil {
		return fmt.Errorf("%v", httpErr.Error)
	}

	return err
}

type postRequestOpts struct {
	// retryCount is the number of times to retry the request
	retryCount uint
	// onlyRetry500 will only retry the request if the status code is in the 500-range
	onlyRetry500 bool
}

func (c *Client) postRequest(relPath string, data interface{}, response interface{}, opts ...postRequestOpts) error {
	var retryCount uint = 1
	var onlyRetry500 bool = false

	if len(opts) > 0 {
		for _, opt := range opts {
			retryCount = opt.retryCount
			onlyRetry500 = opt.onlyRetry500
		}
	}

	var httpErr *types.ExternalError
	var sendErr error

	for i := 0; i < int(retryCount); i++ {
		strData, err := json.Marshal(data)
		if err != nil {
			return err
		}

		req, err := http.NewRequest(
			"POST",
			fmt.Sprintf("%s%s", c.BaseURL, relPath),
			strings.NewReader(string(strData)),
		)
		if err != nil {
			return err
		}

		httpErr, err = c.sendRequest(req, response, true)
		if httpErr == nil && err == nil {
			return nil
		}
		sendErr = err

		if i != int(retryCount)-1 {
			if httpErr != nil {
				if onlyRetry500 && httpErr.Code < 500 {
					// if we only retry 500-range responses and this is not a 500-range response, do not retry, instead return the error
					return fmt.Errorf("%v", httpErr.Error)
				}
				fmt.Fprintf(os.Stderr, "Error: %s (status code %d), retrying request...\n", httpErr.Error, httpErr.Code)
			} else {
				fmt.Fprintf(os.Stderr, "Error: %v, retrying request...\n", err)
			}
		}
	}

	if httpErr != nil {
		return fmt.Errorf("%v", httpErr.Error)
	}

	return sendErr
}

type patchRequestOpts struct {
	retryCount uint
}

func (c *Client) patchRequest(relPath string, data interface{}, response interface{}, opts ...patchRequestOpts) error {
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
			"PATCH",
			fmt.Sprintf("%s%s", c.BaseURL, relPath),
			strings.NewReader(string(strData)),
		)
		if err != nil {
			return err
		}

		httpErr, err = c.sendRequest(req, response, true)

		if httpErr == nil && err == nil {
			return nil
		}

		if i != int(retryCount)-1 {
			if httpErr != nil {
				fmt.Fprintf(os.Stderr, "Error: %s (status code %d), retrying request...\n", httpErr.Error, httpErr.Code)
			} else {
				fmt.Fprintf(os.Stderr, "Error: %v, retrying request...\n", err)
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

	if httpErr, err := c.sendRequest(req, response, true); httpErr != nil || err != nil {
		if httpErr != nil {
			return fmt.Errorf("%v", httpErr.Error)
		}

		return err
	}

	return nil
}

func (c *Client) sendRequest(req *http.Request, v interface{}, useCookie bool) (*types.ExternalError, error) {
	req.Header.Set("Content-Type", "application/json; charset=utf-8")
	req.Header.Set("Accept", "application/json; charset=utf-8")

	if c.Token != "" {
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.Token))
	} else if cookie, _ := c.getCookie(); useCookie && cookie != nil {
		c.Cookie = cookie
		req.AddCookie(c.Cookie)
	}

	if c.cfToken != "" {
		req.Header.Set("cf-access-token", c.cfToken)
	}

	res, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, err
	}

	defer res.Body.Close()

	if cookies := res.Cookies(); len(cookies) == 1 {
		c.saveCookie(cookies[0])
	}

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

// CookieStorage for temporary fs-based cookie storage before jwt tokens
type CookieStorage struct {
	Cookie *http.Cookie `json:"cookie"`
}

// saves single cookie to file
func (c *Client) saveCookie(cookie *http.Cookie) error {
	data, err := json.Marshal(&CookieStorage{
		Cookie: cookie,
	})
	if err != nil {
		return err
	}

	return ioutil.WriteFile(c.CookieFilePath, data, 0o644)
}

// retrieves single cookie from file
func (c *Client) getCookie() (*http.Cookie, error) {
	data, err := ioutil.ReadFile(c.CookieFilePath)
	if err != nil {
		return nil, err
	}

	cookie := &CookieStorage{}

	err = json.Unmarshal(data, cookie)

	if err != nil {
		return nil, err
	}

	return cookie.Cookie, nil
}

// retrieves single cookie from file
func (c *Client) deleteCookie() error {
	// if file does not exist, return no error
	if _, err := os.Stat(c.CookieFilePath); os.IsNotExist(err) {
		return nil
	}

	return os.Remove(c.CookieFilePath)
}

type TokenProjectID struct {
	ProjectID uint `json:"project_id"`
}

func GetProjectIDFromToken(token string) (uint, bool, error) {
	var encoded string

	if tokenSplit := strings.Split(token, "."); len(tokenSplit) != 3 {
		return 0, false, fmt.Errorf("invalid jwt token format")
	} else {
		encoded = tokenSplit[1]
	}

	decodedBytes, err := base64.RawStdEncoding.DecodeString(encoded)
	if err != nil {
		return 0, false, fmt.Errorf("could not decode jwt token from base64: %v", err)
	}

	res := &TokenProjectID{}

	err = json.Unmarshal(decodedBytes, res)

	if err != nil {
		return 0, false, fmt.Errorf("could not get token project id: %v", err)
	}

	// if the project ID is 0, this is a token signed for a user, not a specific project
	if res.ProjectID == 0 {
		return 0, false, nil
	}

	return res.ProjectID, true, nil
}
