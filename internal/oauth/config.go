package oauth

import (
	"crypto/rand"
	"encoding/base64"

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
		RedirectURL: cfg.BaseURL + "/api/auth/callback/github",
		Scopes:      cfg.Scopes,
	}
}

func CreateRandomState() string {
	b := make([]byte, 16)
	rand.Read(b)

	state := base64.URLEncoding.EncodeToString(b)

	return state
}
