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
	client *ld.LDClient
}

// BoolVariation returns the value of a boolean feature flag for a given evaluation context.
//
// Returns defaultVal if there is an error, if the flag doesn't exist, or the feature is turned off and
// has no off variation.
//
// For more information, see the Reference Guide: https://docs.launchdarkly.com/sdk/features/evaluating#go
func (c Client) BoolVariation(field string, context ldcontext.Context, defaultValue bool) (bool, error) {
	if c.client == nil {
		return defaultValue, errors.New("failed to participate in launchdarkly test: no client available")
	}
	return c.client.BoolVariation(field, context, defaultValue)
}

// GetClient retrieves a Client for interacting with LaunchDarkly
func GetClient(launchDarklySDKKey string) (*Client, error) {
	ldClient, err := ld.MakeClient(launchDarklySDKKey, 5*time.Second)
	if err != nil {
		return &Client{}, fmt.Errorf("failed to create new launchdarkly client: %w", err)
	}

	if ldClient == nil {
		return &Client{}, errors.New("failed to create new launchdarkly client: invalid config")
	}

	if !ldClient.Initialized() {
		return &Client{}, errors.New("failed to create new launchdarkly client: sdk failed to initialize")
	}

	return &Client{ldClient}, nil
}
