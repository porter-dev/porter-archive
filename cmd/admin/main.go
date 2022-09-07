//go:build ee
// +build ee

package main

import (
	"os"

	"github.com/fatih/color"
	"github.com/porter-dev/porter/api/server/shared/config/envloader"
	"github.com/porter-dev/porter/internal/adapter"
	"github.com/porter-dev/porter/internal/notifier"
	"github.com/porter-dev/porter/internal/notifier/sendgrid"
	"github.com/porter-dev/porter/internal/oauth"
	"github.com/porter-dev/porter/internal/repository"
	"github.com/porter-dev/porter/internal/repository/credentials"
	pgorm "github.com/porter-dev/porter/internal/repository/gorm"
	"github.com/spf13/cobra"
	"golang.org/x/oauth2"
	"gorm.io/gorm"

	"github.com/porter-dev/porter/ee/integrations/vault"

	lr "github.com/porter-dev/porter/pkg/logger"
)

var db *gorm.DB
var repo repository.Repository
var doConf *oauth2.Config
var userNotifier notifier.UserNotifier
var envName string
var notifyEmail string

func main() {
	notifyEmail = os.Getenv("NOTIFY_EMAIL")

	// initialize the database
	logger := lr.NewConsole(true)

	envConf, err := envloader.FromEnv()

	if err != nil {
		logger.Fatal().Err(err).Msg("could not load env conf")
		return
	}

	db, err = adapter.New(envConf.DBConf)

	if err != nil {
		logger.Fatal().Err(err).Msg("could not connect to the database")
		return
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

	repo = pgorm.NewRepository(db, &key, credBackend)

	if envConf.ServerConf.DOClientID != "" && envConf.ServerConf.DOClientSecret != "" {
		doConf = oauth.NewDigitalOceanClient(&oauth.Config{
			ClientID:     envConf.ServerConf.DOClientID,
			ClientSecret: envConf.ServerConf.DOClientSecret,
			Scopes:       []string{"read", "write"},
			BaseURL:      envConf.ServerConf.ServerURL,
		})
	}

	userNotifier = &notifier.EmptyUserNotifier{}

	if envConf.ServerConf.SendgridAPIKey != "" && envConf.ServerConf.SendgridSenderEmail != "" {
		userNotifier = sendgrid.NewUserNotifier(&sendgrid.Client{
			APIKey:      envConf.ServerConf.SendgridAPIKey,
			SenderEmail: envConf.ServerConf.SendgridSenderEmail,
		})
	}

	envName = envConf.ServerConf.InstanceName

	if envName == "" {
		envName = "test"
	}

	// call the admin CLI command with the database connection
	if err := adminCmd.Execute(); err != nil {
		color.New(color.FgRed).Println(err)
		os.Exit(1)
	}
}

// adminCmd represents the base command when called without any subcommands
var adminCmd = &cobra.Command{
	Use:   "admin",
	Short: "Admin command-line tool for managing a Porter instance.",
}
