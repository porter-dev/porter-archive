package env

import "time"

// ServerConf is the server configuration
type ServerConf struct {
	Debug bool `env:"DEBUG,default=false"`

	ServerURL string `env:"SERVER_URL,default=http://localhost:8080"`

	// The instance name is used to set a name for integrations linked only by a project ID,
	// in order to differentiate between the same project ID on different instances. For example,
	// when writing a Github secret with `PORTER_TOKEN_<PROJECT_ID>`, setting this value will change
	// this to `PORTER_TOKEN_<INSTANCE_NAME>_<PROJECT_ID>`
	InstanceName string `env:"INSTANCE_NAME"`

	UsageTrackingEnabled bool `env:"USAGE_TRACKING_ENABLED,default=false"`

	Port                 int           `env:"SERVER_PORT,default=8080"`
	StaticFilePath       string        `env:"STATIC_FILE_PATH,default=/porter/static"`
	CookieName           string        `env:"COOKIE_NAME,default=porter"`
	CookieSecrets        []string      `env:"COOKIE_SECRETS,default=random_hash_key_;random_block_key"`
	CookieInsecure       bool          `env:"COOKIE_INSECURE,default=false"`
	TokenGeneratorSecret string        `env:"TOKEN_GENERATOR_SECRET,default=secret"`
	TimeoutRead          time.Duration `env:"SERVER_TIMEOUT_READ,default=5s"`
	TimeoutWrite         time.Duration `env:"SERVER_TIMEOUT_WRITE,default=60s"`
	TimeoutIdle          time.Duration `env:"SERVER_TIMEOUT_IDLE,default=15s"`
	IsLocal              bool          `env:"IS_LOCAL,default=false"`
	IsTesting            bool          `env:"IS_TESTING,default=false"`
	AppRootDomain        string        `env:"APP_ROOT_DOMAIN,default=porter.run"`

	DefaultApplicationHelmRepoURL string `env:"HELM_APP_REPO_URL,default=https://charts.getporter.dev"`
	DefaultAddonHelmRepoURL       string `env:"HELM_ADD_ON_REPO_URL,default=https://chart-addons.getporter.dev"`

	BasicLoginEnabled bool `env:"BASIC_LOGIN_ENABLED,default=true"`

	GithubClientID     string `env:"GITHUB_CLIENT_ID"`
	GithubClientSecret string `env:"GITHUB_CLIENT_SECRET"`
	GithubLoginEnabled bool   `env:"GITHUB_LOGIN_ENABLED,default=true"`

	GithubIncomingWebhookSecret string `env:"GITHUB_INCOMING_WEBHOOK_SECRET"`

	GithubAppClientID      string `env:"GITHUB_APP_CLIENT_ID"`
	GithubAppClientSecret  string `env:"GITHUB_APP_CLIENT_SECRET"`
	GithubAppName          string `env:"GITHUB_APP_NAME"`
	GithubAppWebhookSecret string `env:"GITHUB_APP_WEBHOOK_SECRET"`
	GithubAppID            string `env:"GITHUB_APP_ID"`
	GithubAppSecretPath    string `env:"GITHUB_APP_SECRET_PATH"`
	// GithubAppSecretBase64 is a base64 encoded version of the GithubAppSecret. This can be used instead of GithubAppSecretPath to pass in a key, allowing for support in systems where mounting the secret is not possible.
	// If GithubAppSecretBase64 is set, it will check for a file at GithubAppSecretPath. If a file is found, the file will NOT be overwritten. If no file it found, then GithubAppSecretBase64 will be decoded and written to GithubAppSecretPath.
	GithubAppSecretBase64 string `env:"GITHUB_APP_SECRET_BASE64"`
	GithubAppSecret       []byte

	GoogleClientID         string `env:"GOOGLE_CLIENT_ID"`
	GoogleClientSecret     string `env:"GOOGLE_CLIENT_SECRET"`
	GoogleRestrictedDomain string `env:"GOOGLE_RESTRICTED_DOMAIN"`

	// FeatureFlagClient controls which client to use (database or launch_darkly)
	FeatureFlagClient  string `env:"FEATURE_FLAG_CLIENT,default=launch_darkly"`
	LaunchDarklySDKKey string `env:"LAUNCHDARKLY_SDK_KEY"`

	SendgridAPIKey                     string `env:"SENDGRID_API_KEY"`
	SendgridPWResetTemplateID          string `env:"SENDGRID_PW_RESET_TEMPLATE_ID"`
	SendgridPWGHTemplateID             string `env:"SENDGRID_PW_GH_TEMPLATE_ID"`
	SendgridVerifyEmailTemplateID      string `env:"SENDGRID_VERIFY_EMAIL_TEMPLATE_ID"`
	SendgridProjectInviteTemplateID    string `env:"SENDGRID_INVITE_TEMPLATE_ID"`
	SendgridIncidentAlertTemplateID    string `env:"SENDGRID_INCIDENT_ALERT_TEMPLATE_ID"`
	SendgridIncidentResolvedTemplateID string `env:"SENDGRID_INCIDENT_RESOLVED_TEMPLATE_ID"`
	SendgridDeleteProjectTemplateID    string `env:"SENDGRID_DELETE_PROJECT_TEMPLATE_ID"`
	SendgridSenderEmail                string `env:"SENDGRID_SENDER_EMAIL"`

	StripeSecretKey      string `env:"STRIPE_SECRET_KEY"`
	StripePublishableKey string `env:"STRIPE_PUBLISHABLE_KEY"`
	SlackClientID        string `env:"SLACK_CLIENT_ID"`
	SlackClientSecret    string `env:"SLACK_CLIENT_SECRET"`

	BillingPrivateKey       string `env:"BILLING_PRIVATE_KEY"`
	BillingPrivateServerURL string `env:"BILLING_PRIVATE_URL"`
	BillingPublicServerURL  string `env:"BILLING_PUBLIC_URL"`
	WhitelistedUsers        []uint `env:"WHITELISTED_USERS"`

	DOClientID     string `env:"DO_CLIENT_ID"`
	DOClientSecret string `env:"DO_CLIENT_SECRET"`

	// Options for the provisioner service
	ProvisionerServerURL string `env:"PROVISIONER_SERVER_URL"`
	ProvisionerToken     string `env:"PROVISIONER_TOKEN"`

	// ClusterControlPlane settings
	ClusterControlPlaneAddress string `env:"CLUSTER_CONTROL_PLANE_ADDRESS"`

	SegmentClientKey string `env:"SEGMENT_CLIENT_KEY"`

	// DnsProvider controls which provider to use for dns (powerdns or cloudflare)
	// Setting this to empty string will disable external dns
	DnsProvider string `env:"DNS_PROVIDER,default=powerdns"`

	// Cloudflare API Key
	CloudflareAPIToken string `env:"CLOUDFLARE_API_TOKEN"`

	// PowerDNS client API key and the host of the PowerDNS API server
	PowerDNSAPIServerURL string `env:"POWER_DNS_API_SERVER_URL"`
	PowerDNSAPIKey       string `env:"POWER_DNS_API_KEY"`

	// Email for an admin user. On a self-hosted instance of Porter, the
	// admin user is the only user that can log in and register. After the admin
	// user has logged in, registration is turned off.
	AdminEmail  string `env:"ADMIN_EMAIL"`
	AdminUserId string `env:"ADMIN_USER_ID"`

	SentryDSN string `env:"SENTRY_DSN"`
	SentryEnv string `env:"SENTRY_ENV,default=dev"`

	InitInCluster bool `env:"INIT_IN_CLUSTER,default=false"`

	WelcomeFormWebhook string `env:"WELCOME_FORM_WEBHOOK"`

	// Token for internal retool to authenticate to internal API endpoints
	RetoolToken string `env:"RETOOL_TOKEN"`

	// Enable pprof profiling endpoints
	PprofEnabled    bool `env:"PPROF_ENABLED,default=false"`
	ProvisionerTest bool `env:"PROVISIONER_TEST,default=false"`

	// Disable filtering for project creation
	DisableAllowlist bool `env:"DISABLE_ALLOWLIST,default=true"`

	// Enable gitlab integration
	EnableGitlab bool `env:"ENABLE_GITLAB,default=false"`

	// DisableRegistrySecretsInjection is used to denote if Porter should not inject
	// imagePullSecrets into a kubernetes deployment (Porter application)
	DisablePullSecretsInjection bool `env:"DISABLE_PULL_SECRETS_INJECTION,default=false"`

	// EnableAutoPreviewBranchDeploy is used to enable preview branch deployments automatically
	// The default behaviour is to automatically create preview deployment against a deploy branch
	EnableAutoPreviewBranchDeploy bool `env:"ENABLE_AUTO_PREVIEW_BRANCH_DEPLOY,default=true"`

	// DisableTemporaryKubeconfig is used to denote if Porter should not
	// create a temporary kubeconfig file for a cluster. When set to true, the
	// /api/projects/{project_id}/clusters/{cluster_id}/kubeconfig will be disabled.
	DisableTemporaryKubeconfig bool `env:"DISABLE_TEMPORARY_KUBECONFIG,default=false"`

	// EnableCAPIProvisioner disables checks for ClusterControlPlaneClient and NATS, if set to true
	EnableCAPIProvisioner bool `env:"ENABLE_CAPI_PROVISIONER"`

	// EnableSandbox configures the API server to hit the endpoints designed for Porter's sandbox instance
	EnableSandbox bool `env:"ENABLE_SANDBOX"`

	// NATSUrl is the URL of the NATS cluster. This is required if ENABLE_CAPI_PROVISIONER is true
	NATSUrl string `env:"NATS_URL"`

	// TelemetryName is the name that will group this service during collection
	TelemetryName string `env:"TELEMETRY_NAME"`
	// TelemetryCollectorURL is the URL (host:port) for collecting spans
	TelemetryCollectorURL string `env:"TELEMETRY_COLLECTOR_URL,default=localhost:4317"`
}

// DBConf is the database configuration: if generated from environment variables,
// it assumes the default docker-compose configuration is used
type DBConf struct {
	// EncryptionKey is the key to use for sensitive values that are encrypted at rest
	EncryptionKey string `env:"ENCRYPTION_KEY,default=__random_strong_encryption_key__"`

	Host     string `env:"DB_HOST,default=postgres"`
	Port     int    `env:"DB_PORT,default=5432"`
	Username string `env:"DB_USER,default=porter"`
	Password string `env:"DB_PASS,default=porter"`
	DbName   string `env:"DB_NAME,default=porter"`
	ForceSSL bool   `env:"DB_FORCE_SSL,default=false"`

	SQLLite     bool   `env:"SQL_LITE,default=false"`
	SQLLitePath string `env:"SQL_LITE_PATH,default=/porter/porter.db"`

	// VaultEnabled is used to denote if Porter should use Vault for secrets management. This was previously set by 'ee' build tags
	VaultEnabled   bool   `env:"VAULT_ENABLED,default=false"`
	VaultPrefix    string `env:"VAULT_PREFIX,default=production"`
	VaultAPIKey    string `env:"VAULT_API_KEY"`
	VaultServerURL string `env:"VAULT_SERVER_URL"`
}

// RedisConf is the redis config required for the provisioner container
type RedisConf struct {
	// if redis should be used
	Enabled bool `env:"REDIS_ENABLED,default=true"`

	Host     string `env:"REDIS_HOST,default=redis"`
	Port     string `env:"REDIS_PORT,default=6379"`
	Username string `env:"REDIS_USER"`
	Password string `env:"REDIS_PASS"`
	DB       int    `env:"REDIS_DB,default=0"`
}
