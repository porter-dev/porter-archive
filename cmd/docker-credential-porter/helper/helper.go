package helper

import (
	"context"
	"encoding/base64"
	"fmt"
	"log"
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
type PorterHelper struct{}

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
	cmd.Setup()
	var home = homedir.HomeDir()
	file, _ := os.OpenFile(filepath.Join(home, ".porter", "logs.txt"), os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0666)
	log.SetOutput(file)

	// parse the server url for region
	matches := ecrPattern.FindStringSubmatch(serverURL)

	if len(matches) == 0 {
		return "", "", fmt.Errorf("docker-credential-porter can only be used with Amazon Elastic Container Registry.")
	} else if len(matches) < 3 {
		return "", "", fmt.Errorf(serverURL + "is not a valid repository URI for Amazon Elastic Container Registry.")
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
			ExpiresAt:          time.Now().Add(12 * time.Hour),
			ProxyEndpoint:      serverURL,
		})
	}

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

// List returns the stored serverURLs and their associated usernames.
func (p *PorterHelper) List() (map[string]string, error) {
	credCache := BuildCredentialsCache("")
	entries := credCache.List()

	res := make(map[string]string)

	for _, entry := range entries {
		decodedToken, err := base64.StdEncoding.DecodeString(entry.AuthorizationToken)

		if err != nil {
			continue
		}

		parts := strings.SplitN(string(decodedToken), ":", 2)

		if len(parts) < 2 {
			continue
		}

		res[entry.ProxyEndpoint] = parts[0]
	}

	return res, nil
}
