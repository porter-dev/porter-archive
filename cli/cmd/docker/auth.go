package docker

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/api/types"
	"k8s.io/client-go/util/homedir"
)

// AuthEntry is a stored token for registry access with an expiration time.
type AuthEntry struct {
	AuthorizationToken string
	RequestedAt        time.Time
	ExpiresAt          time.Time
	ProxyEndpoint      string
}

// IsValid checks if AuthEntry is still valid at runtime. AuthEntries expire at 1/2 of their original
// requested window.
func (authEntry *AuthEntry) IsValid(testTime time.Time) bool {
	validWindow := authEntry.ExpiresAt.Sub(authEntry.RequestedAt)
	refreshTime := authEntry.ExpiresAt.Add(-1 * validWindow / time.Duration(2))
	return testTime.Before(refreshTime)
}

// CredentialsCache is a simple interface for getting/setting auth credentials
// so that we don't request new tokens when previous ones haven't expired
type CredentialsCache interface {
	Get(registry string) *AuthEntry
	Set(registry string, entry *AuthEntry)
	List() []*AuthEntry
}

// AuthGetter retrieves
type AuthGetter struct {
	Client    api.Client
	Cache     CredentialsCache
	ProjectID uint
}

// GetCredentials returns registry credentials
func (a *AuthGetter) GetCredentials(ctx context.Context, serverURL string) (user string, secret string, err error) {
	if strings.Contains(serverURL, "gcr.io") {
		return a.GetGCRCredentials(ctx, serverURL, a.ProjectID)
	} else if strings.Contains(serverURL, "pkg.dev") {
		return a.GetGARCredentials(ctx, serverURL, a.ProjectID)
	} else if strings.Contains(serverURL, "registry.digitalocean.com") {
		return a.GetDOCRCredentials(ctx, serverURL, a.ProjectID)
	} else if strings.Contains(serverURL, "index.docker.io") {
		return a.GetDockerHubCredentials(ctx, serverURL, a.ProjectID)
	} else if strings.Contains(serverURL, "azurecr.io") {
		return a.GetACRCredentials(ctx, serverURL, a.ProjectID)
	}

	return a.GetECRCredentials(ctx, serverURL, a.ProjectID)
}

// GetGCRCredentials returns GCR credentials
func (a *AuthGetter) GetGCRCredentials(ctx context.Context, serverURL string, projID uint) (user string, secret string, err error) {
	if err != nil {
		return "", "", err
	}

	cachedEntry := a.Cache.Get(serverURL)

	var token string

	if cachedEntry != nil && cachedEntry.IsValid(time.Now()) {
		token = cachedEntry.AuthorizationToken
	} else {
		// get a token from the server
		tokenResp, err := a.Client.GetGCRAuthorizationToken(ctx, projID, &types.GetRegistryGCRTokenRequest{
			ServerURL: serverURL,
		})
		if err != nil {
			return "", "", err
		}

		token = tokenResp.Token

		// set the token in cache
		a.Cache.Set(serverURL, &AuthEntry{
			AuthorizationToken: token,
			RequestedAt:        time.Now(),
			ExpiresAt:          tokenResp.ExpiresAt,
			ProxyEndpoint:      serverURL,
		})
	}

	return "oauth2accesstoken", token, nil
}

// GetGARCredentials returns GAR credentials
func (a *AuthGetter) GetGARCredentials(ctx context.Context, serverURL string, projID uint) (user string, secret string, err error) {
	if err != nil {
		return "", "", err
	}

	cachedEntry := a.Cache.Get(serverURL)

	parsedURL, err := url.Parse(serverURL)
	if err != nil {
		return "", "", err
	}

	serverURL = parsedURL.String()

	var token string

	if cachedEntry != nil && cachedEntry.IsValid(time.Now()) {
		token = cachedEntry.AuthorizationToken
	} else {
		// get a token from the server
		tokenResp, err := a.Client.GetGARAuthorizationToken(ctx, projID, &types.GetRegistryGARTokenRequest{
			ServerURL: serverURL,
		})
		if err != nil {
			return "", "", err
		}

		token = tokenResp.Token

		// set the token in cache
		a.Cache.Set(serverURL, &AuthEntry{
			AuthorizationToken: token,
			RequestedAt:        time.Now(),
			ExpiresAt:          tokenResp.ExpiresAt,
			ProxyEndpoint:      serverURL,
		})
	}

	return "oauth2accesstoken", token, nil
}

// GetDOCRCredentials returns DOCR credentials
func (a *AuthGetter) GetDOCRCredentials(ctx context.Context, serverURL string, projID uint) (user string, secret string, err error) {
	cachedEntry := a.Cache.Get(serverURL)

	var token string

	if cachedEntry != nil && cachedEntry.IsValid(time.Now()) {
		token = cachedEntry.AuthorizationToken
	} else {

		// get a token from the server
		tokenResp, err := a.Client.GetDOCRAuthorizationToken(ctx, projID, &types.GetRegistryGCRTokenRequest{
			ServerURL: serverURL,
		})
		if err != nil {
			return "", "", err
		}

		token = tokenResp.Token

		if t := tokenResp.ExpiresAt; len(token) > 0 && !t.IsZero() {
			// set the token in cache
			a.Cache.Set(serverURL, &AuthEntry{
				AuthorizationToken: token,
				RequestedAt:        time.Now(),
				ExpiresAt:          t,
				ProxyEndpoint:      serverURL,
			})
		}

	}

	return token, token, nil
}

var ecrPattern = regexp.MustCompile(`(^[a-zA-Z0-9][a-zA-Z0-9-_]*)\.dkr\.ecr(\-fips)?\.([a-zA-Z0-9][a-zA-Z0-9-_]*)\.amazonaws\.com(\.cn)?`)

// GetECRCredentials returns ECR credentials
func (a *AuthGetter) GetECRCredentials(ctx context.Context, serverURL string, projID uint) (user string, secret string, err error) {
	// parse the server url for region
	matches := ecrPattern.FindStringSubmatch(serverURL)

	if len(matches) == 0 {
		err := fmt.Errorf("only ECR registry URLs are supported")

		return "", "", err
	} else if len(matches) < 3 {
		err := fmt.Errorf("%s is not a valid ECR repository URI", serverURL)

		return "", "", err
	}

	cachedEntry := a.Cache.Get(serverURL)
	var token string

	if cachedEntry != nil && cachedEntry.IsValid(time.Now()) {
		token = cachedEntry.AuthorizationToken
	} else {
		// get a token from the server
		tokenResp, err := a.Client.GetECRAuthorizationToken(ctx, projID, &types.GetRegistryECRTokenRequest{
			Region:    matches[3],
			AccountID: matches[1],
		})
		if err != nil {
			return "", "", err
		}

		token = tokenResp.Token

		// set the token in cache
		a.Cache.Set(serverURL, &AuthEntry{
			AuthorizationToken: token,
			RequestedAt:        time.Now(),
			ExpiresAt:          tokenResp.ExpiresAt,
			ProxyEndpoint:      serverURL,
		})
	}

	return decodeDockerToken(token)
}

// GetDockerHubCredentials returns dockerhub credentials
func (a *AuthGetter) GetDockerHubCredentials(ctx context.Context, serverURL string, projID uint) (user string, secret string, err error) {
	cachedEntry := a.Cache.Get(serverURL)
	var token string

	if cachedEntry != nil && cachedEntry.IsValid(time.Now()) {
		token = cachedEntry.AuthorizationToken
	} else {
		// get a token from the server
		tokenResp, err := a.Client.GetDockerhubAuthorizationToken(ctx, projID)
		if err != nil {
			return "", "", err
		}

		token = tokenResp.Token

		// set the token in cache
		a.Cache.Set(serverURL, &AuthEntry{
			AuthorizationToken: token,
			RequestedAt:        time.Now(),
			ExpiresAt:          tokenResp.ExpiresAt,
			ProxyEndpoint:      serverURL,
		})
	}

	return decodeDockerToken(token)
}

// GetACRCredentials returns ACR credentials
func (a *AuthGetter) GetACRCredentials(ctx context.Context, serverURL string, projID uint) (user string, secret string, err error) {
	cachedEntry := a.Cache.Get(serverURL)
	var token string

	if cachedEntry != nil && cachedEntry.IsValid(time.Now()) {
		token = cachedEntry.AuthorizationToken
	} else {
		req := &types.GetRegistryACRTokenRequest{ServerURL: serverURL}
		tokenResp, err := a.Client.GetACRAuthorizationToken(ctx, projID, req)
		if err != nil {
			return "", "", err
		}

		token = tokenResp.Token

		// set the token in cache
		a.Cache.Set(serverURL, &AuthEntry{
			AuthorizationToken: token,
			RequestedAt:        time.Now(),
			ExpiresAt:          tokenResp.ExpiresAt,
			ProxyEndpoint:      serverURL,
		})
	}

	return decodeDockerToken(token)
}

func decodeDockerToken(token string) (string, string, error) {
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

type FileCredentialCache struct {
	path           string
	filename       string
	cachePrefixKey string
}

const registryCacheVersion = "1.0"

type RegistryCache struct {
	Registries map[string]*AuthEntry
	Version    string
}

type fileCredentialCache struct {
	path           string
	filename       string
	cachePrefixKey string
}

func newRegistryCache() *RegistryCache {
	return &RegistryCache{
		Registries: make(map[string]*AuthEntry),
		Version:    registryCacheVersion,
	}
}

// NewFileCredentialsCache returns a new file credentials cache.
//
// path is used for temporary files during save, and filename should be a relative filename
// in the same directory where the cache is serialized and deserialized.
//
// cachePrefixKey is used for scoping credentials for a given credential cache (i.e. region and
// accessKey).
func NewFileCredentialsCache() CredentialsCache {
	home := homedir.HomeDir()
	path := filepath.Join(home, ".porter")

	if _, err := os.Stat(path); err != nil {
		os.MkdirAll(path, 0o700)
	}

	return &FileCredentialCache{path: path, filename: "cache.json"}
}

func (f *FileCredentialCache) Get(registry string) *AuthEntry {
	registryCache := f.init()

	return registryCache.Registries[f.cachePrefixKey+registry]
}

func (f *FileCredentialCache) Set(registry string, entry *AuthEntry) {
	registryCache := f.init()

	registryCache.Registries[f.cachePrefixKey+registry] = entry

	f.save(registryCache)
}

func (f *FileCredentialCache) Clear() {
	os.Remove(f.fullFilePath())
}

// List returns all of the available AuthEntries (regardless of prefix)
func (f *FileCredentialCache) List() []*AuthEntry {
	registryCache := f.init()

	// optimize allocation for copy
	entries := make([]*AuthEntry, 0, len(registryCache.Registries))

	for _, entry := range registryCache.Registries {
		entries = append(entries, entry)
	}

	return entries
}

func (f *FileCredentialCache) fullFilePath() string {
	return filepath.Join(f.path, f.filename)
}

// Saves credential cache to disk. This writes to a temporary file first, then moves the file to the config location.
// This eliminates from reading partially written credential files, and reduces (but does not eliminate) concurrent
// file access. There is not guarantee here for handling multiple writes at once since there is no out of process locking.
func (f *FileCredentialCache) save(registryCache *RegistryCache) error {
	file, err := ioutil.TempFile(f.path, ".config.json.tmp")
	if err != nil {
		return err
	}

	buff, err := json.MarshalIndent(registryCache, "", "  ")
	if err != nil {
		file.Close()
		os.Remove(file.Name())
		return err
	}

	_, err = file.Write(buff)
	if err != nil {
		file.Close()
		os.Remove(file.Name())
		return err
	}

	file.Close()
	// note this is only atomic when relying on linux syscalls
	os.Rename(file.Name(), f.fullFilePath())
	return err
}

func (f *FileCredentialCache) init() *RegistryCache {
	registryCache, err := f.load()
	if err != nil {
		f.Clear()
		registryCache = newRegistryCache()
	}
	return registryCache
}

// Loading a cache from disk will return errors for malformed or incompatible cache files.
func (f *FileCredentialCache) load() (*RegistryCache, error) {
	registryCache := newRegistryCache()

	file, err := os.Open(f.fullFilePath())
	if os.IsNotExist(err) {
		return registryCache, nil
	}

	if err != nil {
		return nil, err
	}

	defer file.Close()

	if err = json.NewDecoder(file).Decode(&registryCache); err != nil {
		return nil, err
	}

	return registryCache, nil
}
