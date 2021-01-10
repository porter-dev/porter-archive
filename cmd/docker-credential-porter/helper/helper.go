package helper

import (
	"context"
	"encoding/base64"
	"fmt"
	"log"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/docker/docker-credential-helpers/credentials"
	"github.com/porter-dev/porter/cli/cmd"
	"github.com/porter-dev/porter/cli/cmd/api"
	"github.com/spf13/viper"
	"k8s.io/client-go/util/homedir"
)

// PorterHelper implements credentials.Helper: it acts as a credentials
// helper for Docker that allows authentication with different registries.
type PorterHelper struct {
	Debug bool

	credCache CredentialsCache
}

// Add appends credentials to the store.
func (p *PorterHelper) Add(cr *credentials.Credentials) error {
	// Doesn't seem to be called
	return nil
}

// Delete removes credentials from the store.
func (p *PorterHelper) Delete(serverURL string) error {
	// Doesn't seem to be called
	return nil
}

var ecrPattern = regexp.MustCompile(`(^[a-zA-Z0-9][a-zA-Z0-9-_]*)\.dkr\.ecr(\-fips)?\.([a-zA-Z0-9][a-zA-Z0-9-_]*)\.amazonaws\.com(\.cn)?`)

// Get retrieves credentials from the store.
// It returns username and secret as strings.
func (p *PorterHelper) Get(serverURL string) (user string, secret string, err error) {
	p.init()

	if strings.Contains(serverURL, "gcr.io") {
		return p.getGCR(serverURL)
	}

	return p.getECR(serverURL)
}

func (p *PorterHelper) getGCR(serverURL string) (user string, secret string, err error) {
	urlP, err := url.Parse(serverURL)

	if err != nil {
		return "", "", err
	}

	credCache := BuildCredentialsCache(urlP.Host)
	cachedEntry := credCache.Get(serverURL)

	var token string

	if cachedEntry != nil && cachedEntry.IsValid(time.Now()) {
		token = cachedEntry.AuthorizationToken
	} else {
		host := viper.GetString("host")
		projID := viper.GetUint("project")

		client := api.NewClient(host+"/api", "cookie.json")

		// get a token from the server
		tokenResp, err := client.GetGCRAuthorizationToken(context.Background(), projID, &api.GetGCRTokenRequest{
			ServerURL: serverURL,
		})

		if err != nil {
			return "", "", err
		}

		token = tokenResp.Token

		// set the token in cache
		credCache.Set(serverURL, &AuthEntry{
			AuthorizationToken: token,
			RequestedAt:        time.Now(),
			ExpiresAt:          *tokenResp.ExpiresAt,
			ProxyEndpoint:      serverURL,
		})
	}

	return "oauth2accesstoken", token, nil
}

func (p *PorterHelper) getECR(serverURL string) (user string, secret string, err error) {
	// parse the server url for region
	matches := ecrPattern.FindStringSubmatch(serverURL)

	if len(matches) == 0 {
		err := fmt.Errorf("only ECR registry URLs are supported")

		if p.Debug {
			log.Printf("Error: %s\n", err.Error())
		}

		return "", "", err
	} else if len(matches) < 3 {
		err := fmt.Errorf("%s is not a valid ECR repository URI", serverURL)

		if p.Debug {
			log.Printf("Error: %s\n", err.Error())
		}

		return "", "", err
	}

	region := matches[3]

	credCache := BuildCredentialsCache(region)
	cachedEntry := credCache.Get(serverURL)

	var token string

	if cachedEntry != nil && cachedEntry.IsValid(time.Now()) {
		token = cachedEntry.AuthorizationToken
	} else {
		host := viper.GetString("host")
		projID := viper.GetUint("project")

		client := api.NewClient(host+"/api", "cookie.json")

		// get a token from the server
		tokenResp, err := client.GetECRAuthorizationToken(context.Background(), projID, matches[3])

		if err != nil {
			return "", "", err
		}

		token = tokenResp.Token

		// set the token in cache
		credCache.Set(serverURL, &AuthEntry{
			AuthorizationToken: token,
			RequestedAt:        time.Now(),
			ExpiresAt:          *tokenResp.ExpiresAt,
			ProxyEndpoint:      serverURL,
		})
	}

	return p.getAuth(token)
}

// List returns the stored serverURLs and their associated usernames.
func (p *PorterHelper) List() (map[string]string, error) {
	p.init()

	credCache := BuildCredentialsCache("")
	entries := credCache.List()

	res := make(map[string]string)

	for _, entry := range entries {
		user, _, err := p.getAuth(entry.AuthorizationToken)

		if err != nil {
			continue
		}

		res[entry.ProxyEndpoint] = user
	}

	return res, nil
}

func (p *PorterHelper) getAuth(token string) (string, string, error) {
	decodedToken, err := base64.StdEncoding.DecodeString(token)

	if err != nil {
		return "", "", fmt.Errorf("Invalid token: %v", err)
	}

	parts := strings.SplitN(string(decodedToken), ":", 2)

	if len(parts) < 2 {
		return "", "", fmt.Errorf("Invalid token: expected two parts, got %d", len(parts))
	}

	return parts[0], parts[1], nil
}

func (p *PorterHelper) init() {
	cmd.Setup()

	if p.Debug {
		var home = homedir.HomeDir()
		file, err := os.OpenFile(filepath.Join(home, ".porter", "logs.txt"), os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0666)

		if err == nil {
			log.SetOutput(file)
		}
	}
}
