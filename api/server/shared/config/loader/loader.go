package loader

import (
	"github.com/porter-dev/porter/api/server/shared/apierrors/alerter"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/internal/adapter"
	"github.com/porter-dev/porter/internal/auth/sessionstore"
	"github.com/porter-dev/porter/internal/auth/token"
	"github.com/porter-dev/porter/internal/notifier"
	"github.com/porter-dev/porter/internal/notifier/sendgrid"
	"github.com/porter-dev/porter/internal/repository/gorm"

	lr "github.com/porter-dev/porter/internal/logger"
)

type EnvConfigLoader struct{}

func NewEnvLoader() config.ConfigLoader {
	return &EnvConfigLoader{}
}

func (e *EnvConfigLoader) LoadConfig() (*config.Config, error) {
	envConf, err := FromEnv()

	if err != nil {
		return nil, err
	}

	metadata := config.MetadataFromConf(envConf.ServerConf)

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

	repo := gorm.NewRepository(db, &key)

	// create the session store
	store, err := sessionstore.NewStore(
		&sessionstore.NewStoreOpts{
			SessionRepository: repo.Session(),
			CookieSecrets:     envConf.ServerConf.CookieSecrets,
		},
	)

	if err != nil {
		return nil, err
	}

	tokenConf := &token.TokenGeneratorConf{
		TokenSecret: envConf.ServerConf.TokenGeneratorSecret,
	}

	var notif notifier.UserNotifier = &notifier.EmptyUserNotifier{}

	if metadata.Email {
		notif = sendgrid.NewUserNotifier(&sendgrid.Client{
			APIKey:                  envConf.ServerConf.SendgridAPIKey,
			PWResetTemplateID:       envConf.ServerConf.SendgridPWResetTemplateID,
			PWGHTemplateID:          envConf.ServerConf.SendgridPWGHTemplateID,
			VerifyEmailTemplateID:   envConf.ServerConf.SendgridVerifyEmailTemplateID,
			ProjectInviteTemplateID: envConf.ServerConf.SendgridProjectInviteTemplateID,
			SenderEmail:             envConf.ServerConf.SendgridSenderEmail,
		})
	}

	var errAlerter alerter.Alerter = alerter.NoOpAlerter{}

	if envConf.ServerConf.SentryDSN != "" {
		errAlerter, err = alerter.NewSentryAlerter(envConf.ServerConf.SentryDSN)
	}

	return &config.Config{
		Alerter:      errAlerter,
		Logger:       lr.NewConsole(envConf.ServerConf.Debug),
		Repo:         repo,
		Metadata:     metadata,
		Store:        store,
		ServerConf:   envConf.ServerConf,
		TokenConf:    tokenConf,
		UserNotifier: notif,
	}, nil
}
