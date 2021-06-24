package helper

import (
	"github.com/docker/docker-credential-helpers/credentials"
	"github.com/porter-dev/porter/cli/cmd"
	"github.com/porter-dev/porter/cli/cmd/docker"
)

// PorterHelper implements credentials.Helper: it acts as a credentials
// helper for Docker that allows authentication with different registries.
type PorterHelper struct {
	Debug bool

	ProjectID  uint
	AuthGetter *docker.AuthGetter
	Cache      docker.CredentialsCache
}

func NewPorterHelper(debug bool) *PorterHelper {
	// get the current project ID
	config := cmd.InitAndLoadNewConfig()
	cache := docker.NewFileCredentialsCache()

	return &PorterHelper{
		Debug:     debug,
		ProjectID: config.Project,
		AuthGetter: &docker.AuthGetter{
			Client:    cmd.GetAPIClient(config),
			Cache:     cache,
			ProjectID: config.Project,
		},
		Cache: cache,
	}
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

// Get retrieves credentials from the store.
// It returns username and secret as strings.
func (p *PorterHelper) Get(serverURL string) (user string, secret string, err error) {
	return p.AuthGetter.GetCredentials(serverURL)
}

// List returns the stored serverURLs and their associated usernames.
func (p *PorterHelper) List() (map[string]string, error) {
	entries := p.Cache.List()

	res := make(map[string]string)

	for _, entry := range entries {
		res[entry.ProxyEndpoint] = entry.AuthorizationToken
	}

	return res, nil
}
