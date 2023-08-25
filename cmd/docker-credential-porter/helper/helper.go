package helper

import (
	"context"
	"fmt"

	"github.com/docker/docker-credential-helpers/credentials"
	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/cli/cmd/config"
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

// NewPorterHelper creates a docker credential helper
func NewPorterHelper(debug bool) (*PorterHelper, error) {
	ctx := context.Background()

	// get the current project ID
	cliConfig, err := config.InitAndLoadConfig()
	if err != nil {
		return nil, fmt.Errorf("error loading porter config: %w", err)
	}

	cache := docker.NewFileCredentialsCache()

	client, err := api.NewClientWithConfig(ctx, api.NewClientInput{
		BaseURL:        fmt.Sprintf("%s/api", cliConfig.Host),
		BearerToken:    cliConfig.Token,
		CookieFileName: "cookie.json",
	})
	if err != nil {
		return nil, fmt.Errorf("unable to get porter API client: %w", err)
	}

	return &PorterHelper{
		Debug:     debug,
		ProjectID: cliConfig.Project,
		AuthGetter: &docker.AuthGetter{
			Client:    client,
			Cache:     cache,
			ProjectID: cliConfig.Project,
		},
		Cache: cache,
	}, nil
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
	ctx := context.TODO() // docker credentials.Serve interface blocks changing this for now
	return p.AuthGetter.GetCredentials(ctx, serverURL)
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
