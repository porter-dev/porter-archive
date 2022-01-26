package config

import (
	"fmt"
	"time"

	"github.com/joeshaw/envdecode"
	"github.com/porter-dev/porter/api/server/shared/apierrors/alerter"
	"github.com/porter-dev/porter/api/server/shared/config/env"
	"github.com/porter-dev/porter/ee/integrations/vault"
	"github.com/porter-dev/porter/internal/adapter"
	"github.com/porter-dev/porter/internal/logger"
	"github.com/porter-dev/porter/internal/repository"
	"github.com/porter-dev/porter/internal/repository/credentials"
	"github.com/porter-dev/porter/internal/repository/gorm"
	"github.com/porter-dev/porter/provisioner/integrations/storage"
	"github.com/porter-dev/porter/provisioner/integrations/storage/s3"
)

type Config struct {
	ProvisionerConf *ProvisionerConf
	DBConf          *env.DBConf

	StorageManager storage.StorageManager
	Repo           repository.Repository

	// Logger for logging
	Logger *logger.Logger

	// Alerter to send alerts to a third-party aggregator
	Alerter alerter.Alerter
}

// ProvisionerConf is the env var configuration for the provisioner server
type ProvisionerConf struct {
	Debug bool `env:"DEBUG,default=false"`
	Port  int  `env:"PROVISIONER_PORT,default=8082"`

	TimeoutRead  time.Duration `env:"SERVER_TIMEOUT_READ,default=5s"`
	TimeoutWrite time.Duration `env:"SERVER_TIMEOUT_WRITE,default=10s"`
	TimeoutIdle  time.Duration `env:"SERVER_TIMEOUT_IDLE,default=15s"`

	SentryDSN string `env:"SENTRY_DSN"`
	SentryEnv string `env:"SENTRY_ENV,default=dev"`

	// Configuration for the S3 storage backend
	S3AWSAccessKeyID string `env:"S3_AWS_ACCESS_KEY_ID"`
	S3AWSSecretKey   string `env:"S3_AWS_SECRET_KEY"`
	S3AWSRegion      string `env:"S3_AWS_REGION"`
	S3BucketName     string `env:"S3_BUCKET_NAME"`
	S3EncryptionKey  string `env:"ENCRYPTION_KEY,default=__random_strong_encryption_key__"`
}

type EnvConf struct {
	*ProvisionerConf
	*env.DBConf
}

type EnvDecoderConf struct {
	ProvisionerConf ProvisionerConf
	DBConf          env.DBConf
}

// FromEnv generates a configuration from environment variables
func FromEnv() (*EnvConf, error) {
	var envDecoderConf EnvDecoderConf = EnvDecoderConf{}

	if err := envdecode.StrictDecode(&envDecoderConf); err != nil {
		return nil, fmt.Errorf("Failed to decode server conf: %s", err)
	}

	return &EnvConf{
		ProvisionerConf: &envDecoderConf.ProvisionerConf,
		DBConf:          &envDecoderConf.DBConf,
	}, nil
}

func GetConfig(envConf *EnvConf) (*Config, error) {
	res := &Config{
		ProvisionerConf: envConf.ProvisionerConf,
		DBConf:          envConf.DBConf,
		Logger:          logger.NewConsole(envConf.ProvisionerConf.Debug),
	}

	db, err := adapter.New(envConf.DBConf)

	if err != nil {
		return nil, err
	}

	var key [32]byte

	for i, b := range []byte(envConf.DBConf.EncryptionKey) {
		key[i] = b
	}

	var credBackend credentials.CredentialStorage

	if envConf.DBConf.VaultAPIKey != "" && envConf.DBConf.VaultServerURL != "" && envConf.DBConf.VaultPrefix != "" {
		credBackend = vault.NewClient(
			envConf.DBConf.VaultServerURL,
			envConf.DBConf.VaultAPIKey,
			envConf.DBConf.VaultPrefix,
		)
	}

	res.Repo = gorm.NewRepository(db, &key, credBackend)

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

	return res, nil
}
