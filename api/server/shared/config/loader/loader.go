package loader

import (
	"encoding/base64"
	"errors"
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
	"path/filepath"
	"strconv"

	gorillaws "github.com/gorilla/websocket"
	"github.com/porter-dev/api-contracts/generated/go/porter/v1/porterv1connect"
	"github.com/porter-dev/porter/api/server/shared/apierrors/alerter"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/config/env"
	"github.com/porter-dev/porter/api/server/shared/config/envloader"
	"github.com/porter-dev/porter/api/server/shared/websocket"
	"github.com/porter-dev/porter/ee/integrations/vault"
	"github.com/porter-dev/porter/internal/adapter"
	"github.com/porter-dev/porter/internal/analytics"
	"github.com/porter-dev/porter/internal/auth/sessionstore"
	"github.com/porter-dev/porter/internal/auth/token"
	"github.com/porter-dev/porter/internal/billing"
	"github.com/porter-dev/porter/internal/helm/urlcache"
	"github.com/porter-dev/porter/internal/integrations/powerdns"
	"github.com/porter-dev/porter/internal/notifier"
	"github.com/porter-dev/porter/internal/notifier/sendgrid"
	"github.com/porter-dev/porter/internal/oauth"
	"github.com/porter-dev/porter/internal/repository/credentials"
	"github.com/porter-dev/porter/internal/repository/gorm"
	"github.com/porter-dev/porter/internal/telemetry"
	lr "github.com/porter-dev/porter/pkg/logger"
	"github.com/porter-dev/porter/provisioner/client"
	pgorm "gorm.io/gorm"
)

var (
	InstanceBillingManager billing.BillingManager
	InstanceEnvConf        *envloader.EnvConf
	InstanceDB             *pgorm.DB
)

type EnvConfigLoader struct {
	version string
}

func NewEnvLoader(version string) config.ConfigLoader {
	return &EnvConfigLoader{version}
}

func sharedInit() {
	var err error
	InstanceEnvConf, _ = envloader.FromEnv()

	InstanceDB, err = adapter.New(InstanceEnvConf.DBConf)

	if err != nil {
		panic(err)
	}

	InstanceBillingManager = &billing.NoopBillingManager{}
}

func (e *EnvConfigLoader) LoadConfig() (res *config.Config, err error) {
	// ctx := context.Background()

	envConf := InstanceEnvConf
	sc := envConf.ServerConf

	if envConf == nil {
		return nil, errors.New("nil environment config passed to loader")
	}

	var instanceCredentialBackend credentials.CredentialStorage
	if envConf.DBConf.VaultEnabled {
		if envConf.DBConf.VaultAPIKey == "" || envConf.DBConf.VaultServerURL != "" || envConf.DBConf.VaultPrefix != "" {
			return nil, errors.New("Vault is enabled but missing required environment variables [VAULT_API_KEY,VAULT_SERVER_URL,VAULT_PREFIX]")
		}

		instanceCredentialBackend = vault.NewClient(
			envConf.DBConf.VaultServerURL,
			envConf.DBConf.VaultAPIKey,
			envConf.DBConf.VaultPrefix,
		)
	}

	res = &config.Config{
		Logger:            lr.NewConsole(sc.Debug),
		ServerConf:        sc,
		DBConf:            envConf.DBConf,
		RedisConf:         envConf.RedisConf,
		BillingManager:    InstanceBillingManager,
		CredentialBackend: instanceCredentialBackend,
	}
	res.Logger.Info().Msg("Loading MetadataFromConf")
	res.Metadata = config.MetadataFromConf(envConf.ServerConf, e.version)
	res.Logger.Info().Msg("Loaded MetadataFromConf")
	res.DB = InstanceDB

	// res.Logger.Info().Msg("Starting gorm automigrate")
	// err = gorm.AutoMigrate(InstanceDB, sc.Debug)
	//
	// if err != nil {
	//	return nil, err
	// }
	// res.Logger.Info().Msg("Completed gorm automigrate")

	var key [32]byte

	for i, b := range []byte(envConf.DBConf.EncryptionKey) {
		key[i] = b
	}

	res.Logger.Info().Msg("Creating new gorm repository")
	res.Repo = gorm.NewRepository(InstanceDB, &key, InstanceCredentialBackend)
	res.Logger.Info().Msg("Created new gorm repository")

	res.Logger.Info().Msg("Creating new session store")
	// create the session store
	res.Store, err = sessionstore.NewStore(
		&sessionstore.NewStoreOpts{
			SessionRepository: res.Repo.Session(),
			CookieSecrets:     envConf.ServerConf.CookieSecrets,
			Insecure:          envConf.ServerConf.CookieInsecure,
		},
	)

	if err != nil {
		return nil, err
	}
	res.Logger.Info().Msg("Created new session store")

	res.TokenConf = &token.TokenGeneratorConf{
		TokenSecret: envConf.ServerConf.TokenGeneratorSecret,
	}

	res.UserNotifier = &notifier.EmptyUserNotifier{}

	if res.Metadata.Email {
		res.Logger.Info().Msg("Creating new user notifier")
		res.UserNotifier = sendgrid.NewUserNotifier(&sendgrid.UserNotifierOpts{
			SharedOpts: &sendgrid.SharedOpts{
				APIKey:      envConf.ServerConf.SendgridAPIKey,
				SenderEmail: envConf.ServerConf.SendgridSenderEmail,
			},
			PWResetTemplateID:       envConf.ServerConf.SendgridPWResetTemplateID,
			PWGHTemplateID:          envConf.ServerConf.SendgridPWGHTemplateID,
			VerifyEmailTemplateID:   envConf.ServerConf.SendgridVerifyEmailTemplateID,
			ProjectInviteTemplateID: envConf.ServerConf.SendgridProjectInviteTemplateID,
		})
		res.Logger.Info().Msg("Created new user notifier")
	}

	res.Alerter = alerter.NoOpAlerter{}

	if envConf.ServerConf.SentryDSN != "" {
		res.Logger.Info().Msg("Creating Sentry Alerter")
		res.Alerter, err = alerter.NewSentryAlerter(envConf.ServerConf.SentryDSN, envConf.ServerConf.SentryEnv)
		if err != nil {
			return nil, fmt.Errorf("failed to create new sentry alerter: %w", err)
		}
		res.Logger.Info().Msg("Created Sentry Alerter")
	}

	if sc.DOClientID != "" && sc.DOClientSecret != "" {
		res.Logger.Info().Msg("Creating Digital Ocean client")
		res.DOConf = oauth.NewDigitalOceanClient(&oauth.Config{
			ClientID:     sc.DOClientID,
			ClientSecret: sc.DOClientSecret,
			Scopes:       []string{"read", "write"},
			BaseURL:      sc.ServerURL,
		})
		res.Logger.Info().Msg("Created Digital Ocean client")
	}

	if sc.GoogleClientID != "" && sc.GoogleClientSecret != "" {
		res.Logger.Info().Msg("Creating Google client")
		res.GoogleConf = oauth.NewGoogleClient(&oauth.Config{
			ClientID:     sc.GoogleClientID,
			ClientSecret: sc.GoogleClientSecret,
			Scopes: []string{
				"openid",
				"profile",
				"email",
			},
			BaseURL: sc.ServerURL,
		})
		res.Logger.Info().Msg(" Google client")
	}

	// TODO: remove this as part of POR-1055
	if sc.GithubClientID != "" && sc.GithubClientSecret != "" {
		res.Logger.Info().Msg("Creating Github client")
		res.GithubConf = oauth.NewGithubClient(&oauth.Config{
			ClientID:     sc.GithubClientID,
			ClientSecret: sc.GithubClientSecret,
			Scopes:       []string{"read:user", "user:email"},
			BaseURL:      sc.ServerURL,
		})
		res.Logger.Info().Msg("Created Github client")
	}

	if sc.GithubAppSecretBase64 != "" {
		if sc.GithubAppSecretPath == "" {
			sc.GithubAppSecretPath = "github-app-secret-key"
		}
		_, err := os.Stat(sc.GithubAppSecretPath)
		if err != nil {
			if !errors.Is(err, os.ErrNotExist) {
				return nil, fmt.Errorf("GITHUB_APP_SECRET_BASE64 provided, but error checking if GITHUB_APP_SECRET_PATH exists: %w", err)
			}
			secret, err := base64.StdEncoding.DecodeString(sc.GithubAppSecretBase64)
			if err != nil {
				return nil, fmt.Errorf("GITHUB_APP_SECRET_BASE64 provided, but error decoding: %w", err)
			}
			_, err = createDirectoryRecursively(sc.GithubAppSecretPath)
			if err != nil {
				return nil, fmt.Errorf("GITHUB_APP_SECRET_BASE64 provided, but error creating directory for GITHUB_APP_SECRET_PATH: %w", err)
			}
			err = os.WriteFile(sc.GithubAppSecretPath, secret, os.ModePerm)
			if err != nil {
				return nil, fmt.Errorf("GITHUB_APP_SECRET_BASE64 provided, but error writing to GITHUB_APP_SECRET_PATH: %w", err)
			}
		}
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

		secret, err := ioutil.ReadFile(sc.GithubAppSecretPath)
		if err != nil {
			return nil, fmt.Errorf("could not read github app secret: %s", err)
		}

		sc.GithubAppSecret = append(sc.GithubAppSecret, secret...)
	}

	if sc.SlackClientID != "" && sc.SlackClientSecret != "" {
		res.Logger.Info().Msg("Creating Slack client")
		res.SlackConf = oauth.NewSlackClient(&oauth.Config{
			ClientID:     sc.SlackClientID,
			ClientSecret: sc.SlackClientSecret,
			Scopes: []string{
				"incoming-webhook",
				"team:read",
			},
			BaseURL: sc.ServerURL,
		})
	}
	res.Logger.Info().Msg("Created Slack client")

	res.WSUpgrader = &websocket.Upgrader{
		WSUpgrader: &gorillaws.Upgrader{
			ReadBufferSize:  1024,
			WriteBufferSize: 1024,
			CheckOrigin: func(r *http.Request) bool {
				var err error
				defer func() {
					// TODO: this is only used to collect data for removing the `request origin not allowed by Upgrader.CheckOrigin` error
					if err != nil {
						res.Logger.Info().Msgf("error: %s, host: %s, origin: %s, serverURL: %s", err.Error(), r.Host, r.Header.Get("Origin"), sc.ServerURL)
					}
				}()
				return true
			},
		},
	}

	// construct the whitelisted users map
	wlUsers := make(map[uint]uint)

	for _, userID := range sc.WhitelistedUsers {
		wlUsers[userID] = userID
	}

	res.WhitelistedUsers = wlUsers
	res.Logger.Info().Msg("Creating URL Cache")
	res.URLCache = urlcache.Init(sc.DefaultApplicationHelmRepoURL, sc.DefaultAddonHelmRepoURL)
	res.Logger.Info().Msg("Created URL Cache")

	res.Logger.Info().Msg("Creating provisioner service client")
	provClient, err := getProvisionerServiceClient(sc)
	if err == nil && provClient != nil {
		res.ProvisionerClient = provClient
	}
	res.Logger.Info().Msg("Created provisioner service client")

	res.Logger.Info().Msg("Creating analytics client")
	res.AnalyticsClient = analytics.InitializeAnalyticsSegmentClient(sc.SegmentClientKey, res.Logger)
	res.Logger.Info().Msg("Created analytics client")

	if sc.PowerDNSAPIKey != "" && sc.PowerDNSAPIServerURL != "" {
		res.PowerDNSClient = powerdns.NewClient(sc.PowerDNSAPIServerURL, sc.PowerDNSAPIKey, sc.AppRootDomain)
	}

	res.EnableCAPIProvisioner = sc.EnableCAPIProvisioner
	if sc.EnableCAPIProvisioner {
		res.Logger.Info().Msg("Creating CCP client")
		if sc.ClusterControlPlaneAddress == "" {
			return res, errors.New("must provide CLUSTER_CONTROL_PLANE_ADDRESS")
		}
		client := porterv1connect.NewClusterControlPlaneServiceClient(http.DefaultClient, sc.ClusterControlPlaneAddress)
		res.ClusterControlPlaneClient = client
		res.Logger.Info().Msg("Created CCP client")
	}

	res.TelemetryConfig = telemetry.TracerConfig{
		ServiceName:  sc.TelemetryName,
		CollectorURL: sc.TelemetryCollectorURL,
	}

	return res, nil
}

func getProvisionerServiceClient(sc *env.ServerConf) (*client.Client, error) {
	if sc.ProvisionerServerURL != "" && sc.ProvisionerToken != "" {
		baseURL := fmt.Sprintf("%s/api/v1", sc.ProvisionerServerURL)

		pClient, err := client.NewClient(baseURL, sc.ProvisionerToken, 0)
		if err != nil {
			return nil, err
		}

		return pClient, nil
	}

	return nil, fmt.Errorf("required env vars not set for provisioner")
}

// createDirectoryRecursively creates a directory and all its parents if they don't exist
func createDirectoryRecursively(p string) (*os.File, error) {
	if err := os.MkdirAll(filepath.Dir(p), 0o770); err != nil {
		return nil, err
	}
	return os.Create(p)
}
