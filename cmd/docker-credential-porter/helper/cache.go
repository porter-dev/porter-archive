package helper

import (
	"crypto/md5"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"
	"time"

	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/sirupsen/logrus"
	"k8s.io/client-go/util/homedir"
)

type CredentialsCache interface {
	Get(registry string) *AuthEntry
	Set(registry string, entry *AuthEntry)
	List() []*AuthEntry
	Clear()
}

type AuthEntry struct {
	AuthorizationToken string
	RequestedAt        time.Time
	ExpiresAt          time.Time
	ProxyEndpoint      string
}

// IsValid checks if AuthEntry is still valid at testTime. AuthEntries expire at 1/2 of their original
// requested window.
func (authEntry *AuthEntry) IsValid(testTime time.Time) bool {
	validWindow := authEntry.ExpiresAt.Sub(authEntry.RequestedAt)
	refreshTime := authEntry.ExpiresAt.Add(-1 * validWindow / time.Duration(2))
	return testTime.Before(refreshTime)
}

func BuildCredentialsCache(region string) CredentialsCache {
	home := homedir.HomeDir()
	cacheDir := filepath.Join(home, ".porter")
	cacheFilename := "cache.json"

	return NewFileCredentialsCache(cacheDir, cacheFilename, region)
}

// Determine a key prefix for a credentials cache. Because auth tokens are scoped to an account and region, rely on provided
// region, as well as hash of the access key.
func credentialsCachePrefix(region string, credentials *credentials.Value) string {
	return fmt.Sprintf("%s-%s-", region, checksum(credentials.AccessKeyID))
}

// Base64 encodes an MD5 checksum. Relied on for uniqueness, and not for cryptographic security.
func checksum(text string) string {
	hasher := md5.New()
	data := hasher.Sum([]byte(text))
	return base64.StdEncoding.EncodeToString(data)
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
func NewFileCredentialsCache(path string, filename string, cachePrefixKey string) CredentialsCache {
	if _, err := os.Stat(path); err != nil {
		os.MkdirAll(path, 0700)
	}

	return &fileCredentialCache{path: path, filename: filename, cachePrefixKey: cachePrefixKey}
}

func (f *fileCredentialCache) Get(registry string) *AuthEntry {
	registryCache := f.init()

	return registryCache.Registries[f.cachePrefixKey+registry]
}

func (f *fileCredentialCache) Set(registry string, entry *AuthEntry) {
	registryCache := f.init()

	registryCache.Registries[f.cachePrefixKey+registry] = entry

	f.save(registryCache)
}

// List returns all of the available AuthEntries (regardless of prefix)
func (f *fileCredentialCache) List() []*AuthEntry {
	registryCache := f.init()

	// optimize allocation for copy
	entries := make([]*AuthEntry, 0, len(registryCache.Registries))

	for _, entry := range registryCache.Registries {
		entries = append(entries, entry)
	}

	return entries
}

func (f *fileCredentialCache) Clear() {
	os.Remove(f.fullFilePath())
}

func (f *fileCredentialCache) fullFilePath() string {
	return filepath.Join(f.path, f.filename)
}

// Saves credential cache to disk. This writes to a temporary file first, then moves the file to the config location.
// This eliminates from reading partially written credential files, and reduces (but does not eliminate) concurrent
// file access. There is not guarantee here for handling multiple writes at once since there is no out of process locking.
func (f *fileCredentialCache) save(registryCache *RegistryCache) error {
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

func (f *fileCredentialCache) init() *RegistryCache {
	registryCache, err := f.load()
	if err != nil {
		logrus.WithError(err).Info("Could not load existing cache")
		f.Clear()
		registryCache = newRegistryCache()
	}
	return registryCache
}

// Loading a cache from disk will return errors for malformed or incompatible cache files.
func (f *fileCredentialCache) load() (*RegistryCache, error) {
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

	if registryCache.Version != registryCacheVersion {
		return nil, fmt.Errorf("ecr: Registry cache version %#v is not compatible with %#v, ignoring existing cache",
			registryCache.Version,
			registryCacheVersion)
	}

	return registryCache, nil
}
