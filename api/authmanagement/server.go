package authmanagement

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"connectrpc.com/connect"
	grpcreflect "connectrpc.com/grpcreflect"
	otelconnect "connectrpc.com/otelconnect"
	"github.com/joeshaw/envdecode"
	"github.com/porter-dev/api-contracts/generated/go/porter/v1/porterv1connect"
	"github.com/porter-dev/porter/api/server/shared/config/env"
	"github.com/porter-dev/porter/ee/integrations/vault"
	"github.com/porter-dev/porter/internal/adapter"
	"github.com/porter-dev/porter/internal/repository"
	"github.com/porter-dev/porter/internal/repository/credentials"
	"github.com/porter-dev/porter/internal/repository/gorm"
	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"
)

// ServiceEnv contains all environment variables for the AuthManagementService
type ServiceEnv struct {
	// Port is the port that the AuthManagementService listens on
	Port int `env:"AUTH_MANAGEMENT_SERVICE_PORT,default=8090"`
	// TokenGeneratorSecret is the secret used to generate JWT tokens
	TokenGeneratorSecret string `env:"TOKEN_GENERATOR_SECRET,default=secret"`
}

// EnvVars holds all the environment variables to be decoded for the AuthManagementService
type EnvVars struct {
	// DBEnv holds all the environment variables for DB connection
	DBEnv env.DBConf
	// ServiceEnv holds all the environment variables specific to the AuthManagementService
	ServiceEnv ServiceEnv
}

// Config contains all configuration options for the AuthManagementService
type Config struct {
	// Port is the port that the AuthManagementService listens on
	Port int
	// TokenGeneratorSecret is the secret used to generate JWT tokens
	TokenGeneratorSecret string
	// APITokenManager is the interface for managing API tokens
	APITokenManager repository.APITokenRepository
}

// AuthManagementService stores the service config and implements the gRPC server's interface
type AuthManagementService struct {
	Config Config
}

// NewService loads the authmanagement.Config from the environment and returns an initialized AuthManagementService
func NewService() (AuthManagementService, error) {
	var server AuthManagementService

	var envVars EnvVars
	if err := envdecode.StrictDecode(&envVars); err != nil {
		return server, fmt.Errorf("failed to decode environment variables: %w", err)
	}

	db, err := adapter.New(&envVars.DBEnv)
	if err != nil {
		return server, fmt.Errorf("failed to create DB client: %w", err)
	}

	var instanceCredentialBackend credentials.CredentialStorage
	if envVars.DBEnv.VaultEnabled {
		instanceCredentialBackend = vault.NewClient(
			envVars.DBEnv.VaultServerURL,
			envVars.DBEnv.VaultAPIKey,
			envVars.DBEnv.VaultPrefix,
		)
	}

	var key [32]byte

	for i, b := range []byte(envVars.DBEnv.EncryptionKey) {
		key[i] = b
	}

	repo := gorm.NewRepository(db, &key, instanceCredentialBackend)

	server.Config = Config{
		Port:                 envVars.ServiceEnv.Port,
		TokenGeneratorSecret: envVars.ServiceEnv.TokenGeneratorSecret,
		APITokenManager:      repo.APIToken(),
	}

	return server, nil
}

// ListenAndServe starts the AuthManagementService and will shutdown when the context is canceled
func (a AuthManagementService) ListenAndServe(ctx context.Context) error {
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	mux := http.NewServeMux()

	reflector := grpcreflect.NewStaticReflector(
		"porter.v1.AuthManagementService",
	)
	mux.Handle(grpcreflect.NewHandlerV1(reflector))
	mux.Handle(grpcreflect.NewHandlerV1Alpha(reflector))

	mux.Handle(porterv1connect.NewAuthManagementServiceHandler(a,
		connect.WithInterceptors(
			otelconnect.NewInterceptor(otelconnect.WithTrustRemote()),
		),
	))

	srv := &http.Server{
		Addr:        fmt.Sprintf("0.0.0.0:%d", a.Config.Port),
		ReadTimeout: 5 * time.Second,

		// TODO: remove this. Use h2c so we can serve HTTP/2 without TLS.
		Handler: h2c.NewHandler(mux, &http2.Server{}),
	}
	defer srv.Shutdown(ctx) // nolint:errcheck

	errChan := make(chan error)

	go func() {
		err := srv.ListenAndServe()
		if err != nil {
			errChan <- err
		}
	}()

	select {
	case err := <-errChan:
		return err
	case <-ctx.Done():
	}

	return nil
}
