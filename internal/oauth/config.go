package oauth

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"time"

	"github.com/porter-dev/porter/internal/models/integrations"
	"github.com/porter-dev/porter/internal/repository"
	"golang.org/x/oauth2"
)

type Config struct {
	ClientID     string
	ClientSecret string
	Scopes       []string
	BaseURL      string
}

func NewGithubClient(cfg *Config) *oauth2.Config {
	return &oauth2.Config{
		ClientID:     cfg.ClientID,
		ClientSecret: cfg.ClientSecret,
		Endpoint: oauth2.Endpoint{
			AuthURL:  "https://github.com/login/oauth/authorize",
			TokenURL: "https://github.com/login/oauth/access_token",
		},
		RedirectURL: cfg.BaseURL + "/api/oauth/github/callback",
		Scopes:      cfg.Scopes,
	}
}

func NewGithubAppClient(cfg *Config) *oauth2.Config {
	return &oauth2.Config{
		ClientID:     cfg.ClientID,
		ClientSecret: cfg.ClientSecret,
		Endpoint: oauth2.Endpoint{
			AuthURL:  "https://github.com/login/oauth/authorize",
			TokenURL: "https://github.com/login/oauth/access_token",
		},
		RedirectURL: cfg.BaseURL + "/api/oauth/github-app/callback",
		Scopes:      cfg.Scopes,
	}
}

func NewDigitalOceanClient(cfg *Config) *oauth2.Config {
	return &oauth2.Config{
		ClientID:     cfg.ClientID,
		ClientSecret: cfg.ClientSecret,
		Endpoint: oauth2.Endpoint{
			AuthURL:  "https://cloud.digitalocean.com/v1/oauth/authorize",
			TokenURL: "https://cloud.digitalocean.com/v1/oauth/token",
		},
		RedirectURL: cfg.BaseURL + "/api/oauth/digitalocean/callback",
		Scopes:      cfg.Scopes,
	}
}

func NewGoogleClient(cfg *Config) *oauth2.Config {
	return &oauth2.Config{
		ClientID:     cfg.ClientID,
		ClientSecret: cfg.ClientSecret,
		Endpoint: oauth2.Endpoint{
			AuthURL:  "https://accounts.google.com/o/oauth2/v2/auth",
			TokenURL: "https://oauth2.googleapis.com/token",
		},
		RedirectURL: cfg.BaseURL + "/api/oauth/google/callback",
		Scopes:      cfg.Scopes,
	}
}

func CreateRandomState() string {
	b := make([]byte, 16)
	rand.Read(b)

	state := base64.URLEncoding.EncodeToString(b)

	return state
}

// GetAccessToken retrieves an access token for a given client. It updates the
// access token in the DB if necessary
func GetAccessToken(
	o *integrations.OAuthIntegration,
	conf *oauth2.Config,
	repo repository.Repository,
) (string, *time.Time, error) {
	tokSource := conf.TokenSource(context.TODO(), &oauth2.Token{
		AccessToken:  string(o.AccessToken),
		RefreshToken: string(o.RefreshToken),
		TokenType:    "Bearer",
	})

	token, err := tokSource.Token()

	if err != nil {
		return "", nil, err
	}

	if token.AccessToken != string(o.AccessToken) {
		o.AccessToken = []byte(token.AccessToken)
		o.RefreshToken = []byte(token.RefreshToken)

		o, err = repo.OAuthIntegration.UpdateOAuthIntegration(o)

		if err != nil {
			return "", nil, err
		}
	}

	return token.AccessToken, &token.Expiry, nil
}
