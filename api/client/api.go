package client

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/url"
	"path/filepath"
	"strings"
	"time"

	"github.com/gorilla/schema"
	"github.com/porter-dev/porter/api/types"
	"k8s.io/client-go/util/homedir"
)

// Client represents the client for the Porter API
type Client struct {
	BaseURL        string
	HTTPClient     *http.Client
	Cookie         *http.Cookie
	CookieFilePath string
	Token          string
}

// NewClient constructs a new client based on a set of options
func NewClient(baseURL string, cookieFileName string) *Client {
	home := homedir.HomeDir()
	cookieFilePath := filepath.Join(home, ".porter", cookieFileName)

	client := &Client{
		BaseURL:        baseURL,
		CookieFilePath: cookieFilePath,
		HTTPClient: &http.Client{
			Timeout: time.Minute,
		},
	}

	cookie, _ := client.getCookie()

	if cookie != nil {
		client.Cookie = cookie
	}

	return client
}

func NewClientWithToken(baseURL, token string) *Client {
	client := &Client{
		BaseURL: baseURL,
		Token:   token,
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

	req, err := http.NewRequest(
		"GET",
		fmt.Sprintf("%s/%s?%s", c.BaseURL, relPath, urlVals.Encode()),
		nil,
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

func (c *Client) postRequest(relPath string, data interface{}, response interface{}) error {
	strData, err := json.Marshal(data)

	if err != nil {
		return nil
	}

	req, err := http.NewRequest(
		"POST",
		fmt.Sprintf("%s/%s", c.BaseURL, relPath),
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

func (c *Client) deleteRequest(relPath string, data interface{}, response interface{}) error {
	strData, err := json.Marshal(data)

	if err != nil {
		return nil
	}

	req, err := http.NewRequest(
		"DELETE",
		fmt.Sprintf("%s/%s", c.BaseURL, relPath),
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
		debugBytes, _ := ioutil.ReadAll(res.Body)

		fmt.Println(string(debugBytes))

		copyBody := strings.NewReader(string(debugBytes))

		if err = json.NewDecoder(copyBody).Decode(v); err != nil {
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

	return ioutil.WriteFile(c.CookieFilePath, data, 0644)
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
