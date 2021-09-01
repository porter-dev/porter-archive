package loader

import (
	"net/http"
	"strconv"

	"github.com/gorilla/websocket"
	"github.com/porter-dev/porter/api/server/shared/apierrors/alerter"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/internal/adapter"
	"github.com/porter-dev/porter/internal/auth/sessionstore"
	"github.com/porter-dev/porter/internal/auth/token"
	"github.com/porter-dev/porter/internal/helm/urlcache"
	"github.com/porter-dev/porter/internal/notifier"
	"github.com/porter-dev/porter/internal/notifier/sendgrid"
	"github.com/porter-dev/porter/internal/oauth"
	"github.com/porter-dev/porter/internal/repository/gorm"

	lr "github.com/porter-dev/porter/internal/logger"
)

type EnvConfigLoader struct{}

func NewEnvLoader() config.ConfigLoader {
	return &EnvConfigLoader{}
}

func (e *EnvConfigLoader) LoadConfig() (res *config.Config, err error) {
	envConf, err := FromEnv()

	if err != nil {
		return nil, err
	}

	sc := envConf.ServerConf

	res = &config.Config{
		Logger:     lr.NewConsole(sc.Debug),
		ServerConf: sc,
	}

	res.Metadata = config.MetadataFromConf(envConf.ServerConf)

	db, err := adapter.New(envConf.DBConf)

	if err != nil {
		return nil, err
	}

	err = gorm.AutoMigrate(db)

	if err != nil {
		return nil, err
	}

	var key [32]byte

	for i, b := range []byte(envConf.DBConf.EncryptionKey) {
		key[i] = b
	}

	res.Repo = gorm.NewRepository(db, &key)

	// create the session store
	res.Store, err = sessionstore.NewStore(
		&sessionstore.NewStoreOpts{
			SessionRepository: res.Repo.Session(),
			CookieSecrets:     envConf.ServerConf.CookieSecrets,
		},
	)

	if err != nil {
		return nil, err
	}

	res.TokenConf = &token.TokenGeneratorConf{
		TokenSecret: envConf.ServerConf.TokenGeneratorSecret,
	}

	res.UserNotifier = &notifier.EmptyUserNotifier{}

	if res.Metadata.Email {
		res.UserNotifier = sendgrid.NewUserNotifier(&sendgrid.Client{
			APIKey:                  envConf.ServerConf.SendgridAPIKey,
			PWResetTemplateID:       envConf.ServerConf.SendgridPWResetTemplateID,
			PWGHTemplateID:          envConf.ServerConf.SendgridPWGHTemplateID,
			VerifyEmailTemplateID:   envConf.ServerConf.SendgridVerifyEmailTemplateID,
			ProjectInviteTemplateID: envConf.ServerConf.SendgridProjectInviteTemplateID,
			SenderEmail:             envConf.ServerConf.SendgridSenderEmail,
		})
	}

	res.Alerter = alerter.NoOpAlerter{}

	if envConf.ServerConf.SentryDSN != "" {
		res.Alerter, err = alerter.NewSentryAlerter(envConf.ServerConf.SentryDSN)
	}

	if sc.DOClientID != "" && sc.DOClientSecret != "" {
		res.DOConf = oauth.NewDigitalOceanClient(&oauth.Config{
			ClientID:     sc.DOClientID,
			ClientSecret: sc.DOClientSecret,
			Scopes:       []string{"read", "write"},
			BaseURL:      sc.ServerURL,
		})
	}

	if sc.GithubClientID != "" && sc.GithubClientSecret != "" {
		res.GithubConf = oauth.NewGithubClient(&oauth.Config{
			ClientID:     sc.GithubClientID,
			ClientSecret: sc.GithubClientSecret,
			Scopes:       []string{"read:user", "user:email"},
			BaseURL:      sc.ServerURL,
		})
	}

	if sc.GithubAppClientID != "" &&
		sc.GithubAppClientSecret != "" &&
		sc.GithubAppName != "" &&
		sc.GithubAppWebhookSecret != "" &&
		sc.GithubAppSecretPath != "" &&
		sc.GithubAppID != "" {
		if AppID, err := strconv.ParseInt(sc.GithubAppID, 10, 64); err == nil {
			res.GithubAppConf = oauth.NewGithubAppClient(&oauth.Config{
				ClientID:     sc.GithubAppClientID,
				ClientSecret: sc.GithubAppClientSecret,
				Scopes:       []string{"read:user"},
				BaseURL:      sc.ServerURL,
			}, sc.GithubAppName, sc.GithubAppWebhookSecret, sc.GithubAppSecretPath, AppID)
		}
	}

	res.WSUpgrader = &websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
		CheckOrigin: func(r *http.Request) bool {
			origin := r.Header.Get("Origin")
			return origin == sc.ServerURL
		},
	}

	res.URLCache = urlcache.Init(sc.DefaultApplicationHelmRepoURL, sc.DefaultAddonHelmRepoURL)

	return res, nil
}
