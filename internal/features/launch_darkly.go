package features

import (
	"errors"
	"fmt"
	"time"

	"github.com/launchdarkly/go-sdk-common/v3/ldcontext"
	ld "github.com/launchdarkly/go-server-sdk/v6"
)

// Client is a struct wrapper around the launchdarkly client
type Client struct {
	Client      LDClient
	useDatabase bool
}

// LDClient is an interface that allows us to mock
// the LaunchDarkly client in tests
type LDClient interface {
	BoolVariation(key string, context ldcontext.Context, defaultVal bool) (bool, error)
}

// BoolVariation returns the value of a boolean feature flag for a given evaluation context.
//
// Returns defaultVal if there is an error, if the flag doesn't exist, or the feature is turned off and
// has no off variation.
//
// For more information, see the Reference Guide: https://docs.launchdarkly.com/sdk/features/evaluating#go
func (c Client) BoolVariation(field string, context ldcontext.Context, defaultValue bool) (bool, error) {
	if c.Client == nil {
		return defaultValue, errors.New("failed to participate in launchdarkly test: no client available")
	}
	return c.Client.BoolVariation(field, context, defaultValue)
}

// UseDatabase returns whether we should force using the database for feature flags
//
// The initial implementation of feature flags stored flags in
// table-specific columns, making it so we need to use a nasty hack to
// fetch the correct value for on-prem deployments. A proper refactor would
// be to introduce a migration that moved these flags to a feature flags
// table that we could implement a proper WrappedClient for, but a shortcut
// is taken here in order to fix this sooner and give us time for a proper
// refactor.
func (c Client) UseDatabase() bool {
	return c.useDatabase
}

// GetClient retrieves a Client for interacting with LaunchDarkly
func GetClient(featureFlagClient string, launchDarklySDKKey string) (*Client, error) {
	validClients := map[string]bool{
		"database":      true,
		"launch_darkly": true,
	}

	if !validClients[featureFlagClient] {
		return &Client{}, fmt.Errorf("failed to create new feature flag client: invalid feature flag client specified")
	}

	if featureFlagClient == "database" {
		return &Client{
			useDatabase: true,
		}, nil
	}

	if launchDarklySDKKey == "" {
		return &Client{}, fmt.Errorf("failed to create new feature flag client: missing launch_darkly sdk key")
	}

	ldClient, err := ld.MakeClient(launchDarklySDKKey, 5*time.Second)
	if err != nil {
		return &Client{}, fmt.Errorf("failed to create new feature flag client: %w", err)
	}

	if ldClient == nil {
		return &Client{}, errors.New("failed to create new feature flag client: invalid config")
	}

	if !ldClient.Initialized() {
		return &Client{}, errors.New("failed to create new feature flag client: sdk failed to initialize")
	}

	return &Client{
		Client:      ldClient,
		useDatabase: false,
	}, nil
}
