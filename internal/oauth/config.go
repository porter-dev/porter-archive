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

// GithubAppConf is standard oauth2 config but it need to keeps track of the app name and webhook secret
type GithubAppConf struct {
	AppName       string
	WebhookSecret string
	SecretPath    string
	AppID         int64
	oauth2.Config
}

const (
	GithubAuthURL  string = "https://github.com/login/oauth/authorize"
	GithubTokenURL string = "https://github.com/login/oauth/access_token"
	DOAuthURL      string = "https://cloud.digitalocean.com/v1/oauth/authorize"
	DOTokenURL     string = "https://cloud.digitalocean.com/v1/oauth/token"
	GoogleAuthURL  string = "https://accounts.google.com/o/oauth2/v2/auth"
	GoogleTokenURL string = "https://oauth2.googleapis.com/token"
	SlackAuthURL   string = "https://slack.com/oauth/v2/authorize"
	SlackTokenURL  string = "https://slack.com/api/oauth.v2.access"
)

func NewGithubClient(cfg *Config) *oauth2.Config {
	return &oauth2.Config{
		ClientID:     cfg.ClientID,
		ClientSecret: cfg.ClientSecret,
		Endpoint: oauth2.Endpoint{
			AuthURL:  GithubAuthURL,
			TokenURL: GithubTokenURL,
		},
		RedirectURL: cfg.BaseURL + "/api/oauth/github/callback",
		Scopes:      cfg.Scopes,
	}
}

func NewGithubAppClient(cfg *Config, name string, secret string, secretPath string, appID int64) *GithubAppConf {
	return &GithubAppConf{
		AppName:       name,
		WebhookSecret: secret,
		SecretPath:    secretPath,
		AppID:         appID,
		Config: oauth2.Config{
			ClientID:     cfg.ClientID,
			ClientSecret: cfg.ClientSecret,
			Endpoint: oauth2.Endpoint{
				AuthURL:  GithubAuthURL,
				TokenURL: GithubTokenURL,
			},
			RedirectURL: cfg.BaseURL + "/api/oauth/github-app/callback",
			Scopes:      cfg.Scopes,
		},
	}
}

func NewDigitalOceanClient(cfg *Config) *oauth2.Config {
	return &oauth2.Config{
		ClientID:     cfg.ClientID,
		ClientSecret: cfg.ClientSecret,
		Endpoint: oauth2.Endpoint{
			AuthURL:   DOAuthURL,
			TokenURL:  DOTokenURL,
			AuthStyle: oauth2.AuthStyleInParams,
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
			AuthURL:  GoogleAuthURL,
			TokenURL: GoogleTokenURL,
		},
		RedirectURL: cfg.BaseURL + "/api/oauth/google/callback",
		Scopes:      cfg.Scopes,
	}
}

func NewSlackClient(cfg *Config) *oauth2.Config {
	return &oauth2.Config{
		ClientID:     cfg.ClientID,
		ClientSecret: cfg.ClientSecret,
		Endpoint: oauth2.Endpoint{
			AuthURL:  SlackAuthURL,
			TokenURL: SlackTokenURL,
		},
		RedirectURL: cfg.BaseURL + "/api/oauth/slack/callback",
		Scopes:      cfg.Scopes,
	}
}

func CreateRandomState() string {
	b := make([]byte, 16)
	rand.Read(b)

	state := base64.URLEncoding.EncodeToString(b)

	return state
}

// MakeUpdateOAuthIntegrationTokenFunction creates a function to be passed to GetAccessToken that updates the OauthIntegration
// if it needs to be updated
func MakeUpdateOAuthIntegrationTokenFunction(
	o *integrations.OAuthIntegration,
	repo repository.Repository) func(accessToken []byte, refreshToken []byte, expiry time.Time) error {
	return func(accessToken []byte, refreshToken []byte, expiry time.Time) error {
		o.AccessToken = accessToken
		o.RefreshToken = refreshToken
		o.Expiry = expiry

		_, err := repo.OAuthIntegration().UpdateOAuthIntegration(o)

		return err
	}
}

// MakeUpdateGithubAppOauthIntegrationFunction creates a function to be passed to GetAccessToken that updates the GithubAppOauthIntegration
// if it needs to be updated
func MakeUpdateGithubAppOauthIntegrationFunction(
	o *integrations.GithubAppOAuthIntegration,
	repo repository.Repository) func(accessToken []byte, refreshToken []byte, expiry time.Time) error {
	return func(accessToken []byte, refreshToken []byte, expiry time.Time) error {
		o.AccessToken = accessToken
		o.RefreshToken = refreshToken
		o.Expiry = expiry

		_, err := repo.GithubAppOAuthIntegration().UpdateGithubAppOauthIntegration(o)

		return err
	}
}

// MakeUpdateGitlabAppOAuthIntegrationFunction creates a function to be passed to GetAccessToken that updates the GitlabAppOAuthIntegration
// if it needs to be updated
func MakeUpdateGitlabAppOAuthIntegrationFunction(
	projectID uint,
	o *integrations.GitlabAppOAuthIntegration,
	repo repository.Repository,
) func(accessToken []byte, refreshToken []byte, expiry time.Time) error {
	return func(accessToken []byte, refreshToken []byte, expiry time.Time) error {
		o, err := repo.OAuthIntegration().ReadOAuthIntegration(projectID, o.OAuthIntegrationID)

		if err != nil {
			return err
		}

		o.AccessToken = accessToken
		o.RefreshToken = refreshToken
		o.Expiry = expiry

		_, err = repo.OAuthIntegration().UpdateOAuthIntegration(o)

		return err
	}
}

// GetAccessToken retrieves an access token for a given client. It updates the
// access token in the DB if necessary
func GetAccessToken(
	prevToken integrations.SharedOAuthModel,
	conf *oauth2.Config,
	updateToken func(accessToken []byte, refreshToken []byte, expiry time.Time) error,
) (string, *time.Time, error) {
	expiry := prevToken.Expiry
	if conf.Endpoint.AuthURL == DOAuthURL && expiry.IsZero() {
		// manually set the expiry so refresh token is used
		expiry = time.Now().Add(-1 * time.Minute)
	}

	tokSource := conf.TokenSource(context.TODO(), &oauth2.Token{
		AccessToken:  string(prevToken.AccessToken),
		RefreshToken: string(prevToken.RefreshToken),
		TokenType:    "Bearer",
		Expiry:       expiry,
	})

	token, err := tokSource.Token()

	if err != nil {
		return "", nil, err
	}

	if token.AccessToken != string(prevToken.AccessToken) {
		err := updateToken([]byte(token.AccessToken), []byte(token.RefreshToken), token.Expiry)

		if err != nil {
			return "", nil, err
		}
	}

	return token.AccessToken, &token.Expiry, nil
}
