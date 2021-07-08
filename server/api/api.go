package api

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/go-playground/locales/en"
	ut "github.com/go-playground/universal-translator"
	vr "github.com/go-playground/validator/v10"
	"github.com/porter-dev/porter/internal/auth/sessionstore"
	"github.com/porter-dev/porter/internal/auth/token"
	"github.com/porter-dev/porter/internal/oauth"
	"golang.org/x/oauth2"
	"gorm.io/gorm"

	"github.com/gorilla/sessions"
	"github.com/porter-dev/porter/internal/helm"
	"github.com/porter-dev/porter/internal/kubernetes"
	lr "github.com/porter-dev/porter/internal/logger"
	"github.com/porter-dev/porter/internal/repository"
	memory "github.com/porter-dev/porter/internal/repository/memory"
	"github.com/porter-dev/porter/internal/validator"
	segment "gopkg.in/segmentio/analytics-go.v3"
	"helm.sh/helm/v3/pkg/storage"

	"github.com/porter-dev/porter/internal/config"
)

// TestAgents are the k8s agents used for testing
type TestAgents struct {
	HelmAgent             *helm.Agent
	HelmTestStorageDriver *storage.Storage
	K8sAgent              *kubernetes.Agent
}

// AppConfig is the configuration required for creating a new App
type AppConfig struct {
	DB         *gorm.DB
	Logger     *lr.Logger
	Repository *repository.Repository
	ServerConf config.ServerConf
	RedisConf  *config.RedisConf
	DBConf     config.DBConf
	CapConf    config.CapConf

	// TestAgents if API is in testing mode
	TestAgents *TestAgents
}

// App represents an API instance with handler methods attached, a DB connection
// and a logger instance
type App struct {
	// Server configuration
	ServerConf config.ServerConf

	// Logger for logging
	Logger *lr.Logger

	// Repo implements a query repository
	Repo *repository.Repository

	// session store for cookie-based sessions
	Store sessions.Store

	// agents exposed for testing
	TestAgents *TestAgents

	// An in-cluster agent if service is running in cluster
	InClusterAgent *kubernetes.Agent

	// redis client for redis connection
	RedisConf *config.RedisConf

	// config for db
	DBConf config.DBConf

	// config for capabilities
	Capabilities *AppCapabilities

	// oauth-specific clients
	GithubUserConf    *oauth2.Config
	GithubProjectConf *oauth2.Config
	GithubAppConf     *oauth.GithubAppConf
	DOConf            *oauth2.Config
	GoogleUserConf    *oauth2.Config

	db            *gorm.DB
	validator     *vr.Validate
	translator    *ut.Translator
	tokenConf     *token.TokenGeneratorConf
	segmentClient *segment.Client
}

type AppCapabilities struct {
	Provisioning bool `json:"provisioner"`
	Github       bool `json:"github"`
	BasicLogin   bool `json:"basic_login"`
	GithubLogin  bool `json:"github_login"`
	GoogleLogin  bool `json:"google_login"`
	Email        bool `json:"email"`
	Analytics    bool `json:"analytics"`
}

// New returns a new App instance
func New(conf *AppConfig) (*App, error) {
	// create a new validator and translator
	validator := validator.New()

	en := en.New()
	uni := ut.New(en, en)
	translator, found := uni.GetTranslator("en")

	if !found {
		return nil, fmt.Errorf("could not find \"en\" translator")
	}

	app := &App{
		Logger:       conf.Logger,
		Repo:         conf.Repository,
		ServerConf:   conf.ServerConf,
		RedisConf:    conf.RedisConf,
		DBConf:       conf.DBConf,
		TestAgents:   conf.TestAgents,
		Capabilities: &AppCapabilities{},
		db:           conf.DB,
		validator:    validator,
		translator:   &translator,
	}

	// if repository not specified, default to in-memory
	if app.Repo == nil {
		app.Repo = memory.NewRepository(true)
	}

	// create the session store
	store, err := sessionstore.NewStore(app.Repo, app.ServerConf)

	if err != nil {
		return nil, err
	}

	app.Store = store

	// if application is running in-cluster, set provisioning capabilities
	if kubernetes.IsInCluster() {
		app.Capabilities.Provisioning = true

		agent, err := kubernetes.GetAgentInClusterConfig()

		if err != nil {
			return nil, fmt.Errorf("could not get in-cluster agent: %v", err)
		}

		app.InClusterAgent = agent
	}

	sc := conf.ServerConf

	// if server config contains OAuth client info, create clients
	if sc.GithubClientID != "" && sc.GithubClientSecret != "" {
		app.Capabilities.Github = true

		app.GithubUserConf = oauth.NewGithubClient(&oauth.Config{
			ClientID:     sc.GithubClientID,
			ClientSecret: sc.GithubClientSecret,
			Scopes:       []string{"read:user", "user:email"},
			BaseURL:      sc.ServerURL,
		})

		app.GithubProjectConf = oauth.NewGithubClient(&oauth.Config{
			ClientID:     sc.GithubClientID,
			ClientSecret: sc.GithubClientSecret,
			Scopes:       []string{"repo", "read:user", "workflow"},
			BaseURL:      sc.ServerURL,
		})

		app.Capabilities.GithubLogin = sc.GithubLoginEnabled
	}

	if sc.GithubAppClientID != "" && sc.GithubAppClientSecret != "" && sc.GithubAppName != "" {
		app.GithubAppConf = oauth.NewGithubAppClient(&oauth.Config{
			ClientID:     sc.GithubAppClientID,
			ClientSecret: sc.GithubAppClientSecret,
			Scopes:       []string{"read:user"},
			BaseURL:      sc.ServerURL,
		}, sc.GithubAppName)
	}

	if sc.GoogleClientID != "" && sc.GoogleClientSecret != "" {
		app.Capabilities.GoogleLogin = true

		app.GoogleUserConf = oauth.NewGoogleClient(&oauth.Config{
			ClientID:     sc.GoogleClientID,
			ClientSecret: sc.GoogleClientSecret,
			Scopes: []string{
				"openid",
				"profile",
				"email",
			},
			BaseURL: sc.ServerURL,
		})
	}

	if sc.DOClientID != "" && sc.DOClientSecret != "" {
		app.DOConf = oauth.NewDigitalOceanClient(&oauth.Config{
			ClientID:     sc.DOClientID,
			ClientSecret: sc.DOClientSecret,
			Scopes:       []string{"read", "write"},
			BaseURL:      sc.ServerURL,
		})
	}

	app.Capabilities.Email = sc.SendgridAPIKey != ""
	app.Capabilities.Analytics = sc.SegmentClientKey != ""
	app.Capabilities.BasicLogin = sc.BasicLoginEnabled

	app.tokenConf = &token.TokenGeneratorConf{
		TokenSecret: conf.ServerConf.TokenGeneratorSecret,
	}

	if sc := conf.ServerConf; sc.SegmentClientKey != "" {
		client := segment.New(sc.SegmentClientKey)
		app.segmentClient = &client
	}

	return app, nil
}

func (app *App) getTokenFromRequest(r *http.Request) *token.Token {
	reqToken := r.Header.Get("Authorization")

	splitToken := strings.Split(reqToken, "Bearer")

	if len(splitToken) != 2 {
		return nil
	}

	reqToken = strings.TrimSpace(splitToken[1])

	tok, _ := token.GetTokenFromEncoded(reqToken, app.tokenConf)

	return tok
}
