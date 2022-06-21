package config

import (
	"fmt"
	"log"
	"time"

	redis "github.com/go-redis/redis/v8"

	"github.com/joeshaw/envdecode"
	"github.com/porter-dev/porter/api/server/shared/apierrors/alerter"
	"github.com/porter-dev/porter/api/server/shared/config/env"
	"github.com/porter-dev/porter/internal/adapter"
	"github.com/porter-dev/porter/internal/analytics"
	"github.com/porter-dev/porter/internal/kubernetes"
	klocal "github.com/porter-dev/porter/internal/kubernetes/local"
	"github.com/porter-dev/porter/internal/oauth"

	"github.com/porter-dev/porter/internal/repository"
	"github.com/porter-dev/porter/internal/repository/credentials"
	"github.com/porter-dev/porter/internal/repository/gorm"
	"github.com/porter-dev/porter/pkg/logger"
	"github.com/porter-dev/porter/provisioner/integrations/provisioner"
	"github.com/porter-dev/porter/provisioner/integrations/provisioner/k8s"
	"github.com/porter-dev/porter/provisioner/integrations/provisioner/local"
	"github.com/porter-dev/porter/provisioner/integrations/storage"
	"github.com/porter-dev/porter/provisioner/integrations/storage/s3"
	"golang.org/x/oauth2"

	_gorm "gorm.io/gorm"
)

var InstanceCredentialBackend credentials.CredentialStorage
var InstanceEnvConf *EnvConf

func sharedInit() {
	var envDecoderConf EnvDecoderConf = EnvDecoderConf{}

	if err := envdecode.StrictDecode(&envDecoderConf); err != nil {
		log.Fatalf("Failed to decode server conf: %s", err)
	}

	InstanceEnvConf = &EnvConf{
		ProvisionerConf: &envDecoderConf.ProvisionerConf,
		DBConf:          &envDecoderConf.DBConf,
		RedisConf:       envDecoderConf.RedisConf,
	}
}

type Config struct {
	ProvisionerConf *ProvisionerConf
	DBConf          *env.DBConf
	RedisConf       *env.RedisConf

	StorageManager storage.StorageManager
	Repo           repository.Repository

	// Logger for logging
	Logger *logger.Logger

	// Alerter to send alerts to a third-party aggregator
	Alerter alerter.Alerter

	DB *_gorm.DB

	// DOConf is the configuration for a DigitalOcean OAuth client
	DOConf *oauth2.Config

	RedisClient *redis.Client

	Provisioner provisioner.Provisioner

	// AnalyticsClient if Segment analytics reporting is enabled on the API instance
	AnalyticsClient analytics.AnalyticsSegmentClient
}

// ProvisionerConf is the env var configuration for the provisioner server
type ProvisionerConf struct {
	Debug bool `env:"DEBUG,default=false"`
	Port  int  `env:"PROV_PORT,default=8082"`

	TimeoutRead  time.Duration `env:"SERVER_TIMEOUT_READ,default=5s"`
	TimeoutWrite time.Duration `env:"SERVER_TIMEOUT_WRITE,default=10s"`
	TimeoutIdle  time.Duration `env:"SERVER_TIMEOUT_IDLE,default=15s"`

	StaticAuthToken string `env:"STATIC_AUTH_TOKEN"`

	SentryDSN string `env:"SENTRY_DSN"`
	SentryEnv string `env:"SENTRY_ENV,default=dev"`

	// Configuration for the S3 storage backend
	S3AWSAccessKeyID string `env:"S3_AWS_ACCESS_KEY_ID"`
	S3AWSSecretKey   string `env:"S3_AWS_SECRET_KEY"`
	S3AWSRegion      string `env:"S3_AWS_REGION"`
	S3BucketName     string `env:"S3_BUCKET_NAME"`
	S3EncryptionKey  string `env:"S3_ENCRYPTION_KEY,default=__random_strong_encryption_key__"`

	// Configuration for the digitalocean client
	DOClientID        string `env:"DO_CLIENT_ID"`
	DOClientSecret    string `env:"DO_CLIENT_SECRET"`
	DOClientServerURL string `env:"DO_CLIENT_SERVER_URL"`

	// ProvisionerMethod defines the method to use for provisioner: options are "local" or "kubernetes"
	ProvisionerMethod          string `env:"PROVISIONER_METHOD,default=local"`
	ProvisionerBackendURL      string `env:"PROV_BACKEND_URL,default=http://localhost:8082"`
	ProvisionerCredExchangeURL string `env:"PROV_CRED_EXCHANGE_URL,default=http://localhost:8082"`

	// Options to configure for the "kubernetes" provisioner method
	ProvisionerCluster         string `env:"PROVISIONER_CLUSTER"`
	SelfKubeconfig             string `env:"SELF_KUBECONFIG"`
	ProvisionerImageRepo       string `env:"PROV_IMAGE_REPO,default=gcr.io/porter-dev-273614/provisioner"`
	ProvisionerImageTag        string `env:"PROV_IMAGE_TAG,default=latest"`
	ProvisionerImagePullSecret string `env:"PROV_IMAGE_PULL_SECRET"`
	ProvisionerJobNamespace    string `env:"PROV_JOB_NAMESPACE,default=default"`

	// Options to configure for the "local" provisioner method
	LocalTerraformDirectory string `env:"LOCAL_TERRAFORM_DIRECTORY"`

	// Client key for segment to report provisioning events
	SegmentClientKey string `env:"SEGMENT_CLIENT_KEY"`
}

type EnvConf struct {
	*ProvisionerConf
	*env.DBConf
	env.RedisConf
}

type EnvDecoderConf struct {
	ProvisionerConf ProvisionerConf
	DBConf          env.DBConf
	RedisConf       env.RedisConf
}

// FromEnv generates a configuration from environment variables
func FromEnv() (*EnvConf, error) {
	return InstanceEnvConf, nil
}

func GetConfig(envConf *EnvConf) (*Config, error) {
	res := &Config{
		ProvisionerConf: envConf.ProvisionerConf,
		DBConf:          envConf.DBConf,
		RedisConf:       &envConf.RedisConf,
		Logger:          logger.NewConsole(envConf.ProvisionerConf.Debug),
	}

	db, err := adapter.New(envConf.DBConf)

	if err != nil {
		return nil, err
	}

	res.DB = db

	var key [32]byte

	for i, b := range []byte(envConf.DBConf.EncryptionKey) {
		key[i] = b
	}

	res.Repo = gorm.NewRepository(db, &key, InstanceCredentialBackend)

	if envConf.ProvisionerConf.SentryDSN != "" {
		res.Alerter, err = alerter.NewSentryAlerter(envConf.ProvisionerConf.SentryDSN, envConf.ProvisionerConf.SentryEnv)
	}

	// load a storage backend; if correct env vars are not set, throw an error
	if envConf.ProvisionerConf.S3AWSAccessKeyID != "" && envConf.ProvisionerConf.S3AWSSecretKey != "" && envConf.ProvisionerConf.S3EncryptionKey != "" {
		var s3Key [32]byte

		for i, b := range []byte(envConf.ProvisionerConf.S3EncryptionKey) {
			s3Key[i] = b
		}

		res.StorageManager, err = s3.NewS3StorageClient(&s3.S3Options{
			AWSRegion:      envConf.ProvisionerConf.S3AWSRegion,
			AWSAccessKeyID: envConf.ProvisionerConf.S3AWSAccessKeyID,
			AWSSecretKey:   envConf.ProvisionerConf.S3AWSSecretKey,
			AWSBucketName:  envConf.ProvisionerConf.S3BucketName,
			EncryptionKey:  &s3Key,
		})

		if err != nil {
			return nil, err
		}
	} else {
		return nil, fmt.Errorf("no storage backend is available")
	}

	if envConf.RedisConf.Enabled {
		redis, err := adapter.NewRedisClient(&envConf.RedisConf)

		if err != nil {
			return nil, fmt.Errorf("redis connection failed: %v", err)
		}

		res.RedisClient = redis
	} else {
		return nil, fmt.Errorf("no redis client is available")
	}

	if envConf.ProvisionerMethod == "local" {
		res.Provisioner = local.NewLocalProvisioner(&local.LocalProvisionerConfig{
			ProvisionerBackendURL:   envConf.ProvisionerBackendURL,
			LocalTerraformDirectory: envConf.LocalTerraformDirectory,
		})
	} else if envConf.ProvisionerMethod == "kubernetes" {
		provAgent, err := getProvisionerAgent(envConf.ProvisionerConf)

		if err != nil {
			return nil, err
		}

		res.Provisioner = k8s.NewKubernetesProvisioner(provAgent.Clientset, &k8s.KubernetesProvisionerConfig{
			ProvisionerImageRepo:       envConf.ProvisionerImageRepo,
			ProvisionerImageTag:        envConf.ProvisionerImageTag,
			ProvisionerImagePullSecret: envConf.ProvisionerImagePullSecret,
			ProvisionerJobNamespace:    envConf.ProvisionerJobNamespace,
			ProvisionerBackendURL:      envConf.ProvisionerBackendURL,
		})
	}

	if envConf.ProvisionerConf.DOClientID != "" && envConf.ProvisionerConf.DOClientSecret != "" && envConf.ProvisionerConf.DOClientServerURL != "" {
		res.DOConf = oauth.NewDigitalOceanClient(&oauth.Config{
			ClientID:     envConf.ProvisionerConf.DOClientID,
			ClientSecret: envConf.ProvisionerConf.DOClientSecret,
			Scopes:       []string{"read", "write"},
			BaseURL:      envConf.ProvisionerConf.DOClientServerURL,
		})
	}

	res.AnalyticsClient = analytics.InitializeAnalyticsSegmentClient(envConf.ProvisionerConf.SegmentClientKey, res.Logger)

	return res, nil
}

func getProvisionerAgent(conf *ProvisionerConf) (*kubernetes.Agent, error) {
	if conf.ProvisionerCluster == "kubeconfig" && conf.SelfKubeconfig != "" {
		agent, err := klocal.GetSelfAgentFromFileConfig(conf.SelfKubeconfig)

		if err != nil {
			return nil, fmt.Errorf("could not get in-cluster agent: %v", err)
		}

		return agent, nil
	} else if conf.ProvisionerCluster == "kubeconfig" {
		return nil, fmt.Errorf(`"kubeconfig" cluster option requires path to kubeconfig`)
	}

	agent, _ := kubernetes.GetAgentInClusterConfig(conf.ProvisionerJobNamespace)

	return agent, nil
}
